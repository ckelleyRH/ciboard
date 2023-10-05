/*
 * This file is part of ciboard
 *
 * Copyright (c) 2023 Matěj Grabovský <mgrabovs@redhat.com>
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
import { useContext } from 'react';
import {
    Flex,
    Text,
    Title,
    Label,
    Stack,
    Divider,
    TextContent,
    DescriptionList,
    DescriptionListTerm,
    DescriptionListGroup,
    DescriptionListDescription,
} from '@patternfly/react-core';

import styles from '../../custom.module.css';
import {
    Artifact,
    getAType,
    getThreadID,
    ArtifactType,
    ChildTestMsg,
    ArtifactChild,
    isChildTestMsg,
    ChildGreenwave,
    isGreenwaveChild,
    getDatagrepperUrl,
    isGreenwaveAndTestMsg,
    getTestMsgExtendedStatus,
} from '../../types';
import { ExternalLink } from '../ExternalLink';
import { SelectedTestContext } from './contexts';
import {
    secondsToTimestampWithTz,
    timestampToTimestampWithTz,
} from '../../utils/timeUtils';

interface GreenwaveMetadataProps {
    aChild: ChildGreenwave;
}

function GreenwaveMetadata({ aChild }: GreenwaveMetadataProps) {
    /*
     * Greenwave returns a timestamp without a time zone, e.g.
     * 2023-07-19T12:14:02.630361. However, we know the timestamp
     * is in UTC, so we can append the 'Z' to make sure Moment.js
     * takes it into accoutn.
     */
    const submitTimeTz =
        aChild.result?.submit_time && `${aChild.result?.submit_time}Z`;
    const submitTimeReadable =
        submitTimeTz && timestampToTimestampWithTz(submitTimeTz);

    const items = [
        {
            label: 'ResultsDB',
            value: aChild.result?.href && (
                <ExternalLink hasIcon href={aChild.result.href}>
                    Result #{aChild.result.id}
                </ExternalLink>
            ),
        },
        {
            label: 'Timestamp',
            value: submitTimeReadable && (
                <time className={styles['timestamp']} dateTime={submitTimeTz}>
                    {submitTimeReadable}
                </time>
            ),
        },
        {
            label: 'Req. type',
            value: aChild.requirement?.type,
        },
        {
            label: 'Req. scenario',
            value: aChild.requirement?.scenario,
        },
        {
            label: 'Req. source',
            value: aChild.requirement?.source && (
                <ExternalLink hasIcon href={aChild.requirement.source}>
                    Link
                </ExternalLink>
            ),
        },
        {
            label: 'Outcome',
            value: aChild.result?.outcome,
        },
        {
            label: 'Ref. URL',
            value: aChild.result?.ref_url && (
                <ExternalLink hasIcon href={aChild.result.ref_url}>
                    Link
                </ExternalLink>
            ),
        },
    ];

    return (
        <div>
            <Title headingLevel="h3" size="lg">
                Greenwave info
            </Title>
            <DescriptionList isAutoFit isCompact isHorizontal>
                {items.map(({ label, value }, index) =>
                    // Skip undefined or null entries.
                    _.isNil(value) ? null : (
                        <DescriptionListGroup key={index}>
                            <DescriptionListTerm>{label}</DescriptionListTerm>
                            <DescriptionListDescription>
                                {value}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    ),
                )}
            </DescriptionList>
        </div>
    );
}

interface KaiMetadataProps {
    artifactType: ArtifactType;
    aChild: ChildTestMsg;
}

function KaiMetadata(props: KaiMetadataProps) {
    const { artifactType, aChild } = props;

    const messageId = aChild.hitSource.rawData.message.brokerMsgId;
    const datagrepperUrl = getDatagrepperUrl(messageId, artifactType);
    // The original time is in milliseconds since the Unix epoch.
    const timestampMillis = aChild.hitSource.timestamp;
    const timestampUnix = timestampMillis / 1000;
    const submitTime = secondsToTimestampWithTz(timestampUnix);
    // `Date()`, on the other hand, expects milliseconds.
    const submitTimeIso8601 = new Date(timestampMillis).toISOString();

    const items = [
        {
            label: 'Message',
            value: (
                <ExternalLink hasIcon href={datagrepperUrl}>
                    {messageId}
                </ExternalLink>
            ),
        },
        {
            label: 'Timestamp',
            value: (
                <time
                    className={styles['timestamp']}
                    dateTime={submitTimeIso8601}
                >
                    {submitTime}
                </time>
            ),
        },
        {
            label: 'Status',
            value: getTestMsgExtendedStatus(aChild),
        },
        {
            label: 'Thread ID',
            value: getThreadID(aChild),
        },
        {
            label: 'Message version',
            value: aChild.kai_state.version,
        },
    ];

    return (
        <div>
            <Title headingLevel="h3" size="lg">
                UMB info
            </Title>
            <DescriptionList isAutoFit isCompact isHorizontal>
                {items.map(({ label, value }, index) =>
                    // Skip undefined or null entries.
                    _.isNil(value) ? null : (
                        <DescriptionListGroup key={index}>
                            <DescriptionListTerm>{label}</DescriptionListTerm>
                            <DescriptionListDescription>
                                {value}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    ),
                )}
            </DescriptionList>
        </div>
    );
}

interface SourceLabelsProps {
    aChild: ArtifactChild;
}

function SourceLabels({ aChild }: SourceLabelsProps) {
    return (
        <>
            {(isGreenwaveChild(aChild) || isGreenwaveAndTestMsg(aChild)) && (
                <Label color="green">Greenwave</Label>
            )}
            {(isChildTestMsg(aChild) || isGreenwaveAndTestMsg(aChild)) && (
                <Label color="green">UMB</Label>
            )}
        </>
    );
}

interface TestResultMetadataProps {
    artifact?: Artifact;
}

export function TestResultMetadata({ artifact }: TestResultMetadataProps) {
    const selectedTest = useContext(SelectedTestContext);
    if (!artifact || !selectedTest) return null;
    const aChild = selectedTest.originalState;
    const aType = getAType(artifact);

    return (
        <Stack hasGutter>
            <TextContent>
                <Text>
                    The information on this tab are mostly useful only for
                    debugging CI systems.
                </Text>
            </TextContent>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <span>Source of data:</span>
                <SourceLabels aChild={aChild} />
            </Flex>
            {isGreenwaveChild(aChild) && (
                <>
                    <Divider />
                    <GreenwaveMetadata aChild={aChild} />
                </>
            )}
            {isChildTestMsg(aChild) && (
                <>
                    <Divider />
                    <KaiMetadata artifactType={aType} aChild={aChild} />
                </>
            )}
            {isGreenwaveAndTestMsg(aChild) && (
                <>
                    <Divider />
                    <GreenwaveMetadata aChild={aChild.gs} />
                    <Divider />
                    <KaiMetadata artifactType={aType} aChild={aChild.ms} />
                </>
            )}
        </Stack>
    );
}
