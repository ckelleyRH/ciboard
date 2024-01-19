/*
 * This file is part of ciboard
 *
 * Copyright (c) 2023 Andrei Stepanov <astepano@redhat.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import _ from 'lodash';
import { ApolloClient, QueryOptions } from '@apollo/client';
import { Dispatch, createSlice, PayloadAction } from '@reduxjs/toolkit';

// XXX: add global ApoloError redux?

import { Artifact } from '../types';
import { GetState } from '../reduxStore';
import {
    ArtifactsSearchFastQuery1,
    ArtifactsSearchSlowQuery2,
} from '../queries/Artifacts';

interface IStateArtifacts {
    error?: string;
    artList: Artifact[];
    hits_info?: any;
    isLoading: boolean;
    totalHits: number;
    isLoadingExtended: boolean;
}

const INITIAL_STATE: IStateArtifacts = {
    error: undefined,
    artList: [],
    hits_info: {},
    isLoading: false,
    totalHits: 0,
    isLoadingExtended: false,
};

interface artListPayload {
    hits: Artifact[];
    error?: string;
    hits_info: { total: { value: number } };
}

export const artifactsSlice = createSlice({
    name: 'alerts',
    initialState: INITIAL_STATE,
    reducers: {
        artList: (state, action: PayloadAction<artListPayload>) => {
            state.error = action.payload.error;
            state.artList = action.payload.hits;
            state.hits_info = action.payload.hits_info;
            state.isLoading = false;
            state.isLoadingExtended = false;
            state.totalHits = _.get(action.payload, 'hits_info.total.value', 0);
        },
        isLoading: (
            state,
            action: PayloadAction<IStateArtifacts['isLoading']>,
        ) => {
            const isLoading = action.payload;
            state.isLoading = isLoading;
            if (isLoading) {
                state.hits_info = {};
                state.artList = [];
                state.error = undefined;
            }
        },
        isLoadingExtended: (
            state,
            action: PayloadAction<IStateArtifacts['isLoadingExtended']>,
        ) => {
            const isLoadingExtended = action.payload;
            state.isLoadingExtended = isLoadingExtended;
        },
    },
});

export const { artList, isLoading } = artifactsSlice.actions;

export const artifactsReducer = artifactsSlice.reducer;

// Get

export const {
    /** set isLoading to true */
    artList: actArtList,
    isLoading: actIsLoading,
    isLoadingExtended: actIsLoadingExtended,
} = artifactsSlice.actions;

const responseToState = (response: any) => {
    const { hits: hits_, hits_info } = response.data.artifacts;
    const hits = _.map(
        hits_,
        ({ hit_info, hit_source, greenwaveDecision }) => ({
            hit_info: hit_info,
            hit_source: hit_source,
            greenwaveDecision: greenwaveDecision,
        }),
    );
    return { hits: hits as Artifact[], hits_info };
};

export const actLoad =
    (client: ApolloClient<object>, complete?: boolean) =>
    async (dispatch: Dispatch, getState: GetState) => {
        const {
            page,
            sortBy,
            artTypes,
            newerThen,
            queryString,
            doDeepSearch,
            paginationSize,
        } = getState().artifactsCurrentQuery;
        const paginationFrom = (page - 1) * paginationSize;
        let errorText: string;
        try {
            dispatch(actIsLoading(true));
            const queryVars = {
                sortBy,
                artTypes,
                newerThen,
                queryString,
                doDeepSearch,
                paginationSize,
                paginationFrom,
            };
            const query: QueryOptions = {
                query: ArtifactsSearchFastQuery1,
                variables: queryVars,
                errorPolicy: 'all',
                fetchPolicy: 'cache-first',
                notifyOnNetworkStatusChange: true,
            };
            let response = await client.query(query);
            let artList = responseToState(response);
            dispatch(actArtList(artList));
            /** Second stage */
            if (_.isEmpty(artList.hits)) {
                // No results, skip second query
                return;
            }
            query.query = ArtifactsSearchSlowQuery2;
            dispatch(actIsLoadingExtended(true));
            response = await client.query(query);
            artList = responseToState(response);
            dispatch(actArtList(artList));
        } catch (error) {
            if (_.isError(error)) {
                errorText = error.message;
            } else {
                errorText = _.toString(error);
            }
            dispatch(
                actArtList({
                    hits: [],
                    hits_info: { total: { value: 0 } },
                    error: errorText,
                }),
            );
        }
    };
