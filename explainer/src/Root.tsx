import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Explainer} from './Explainer';
import timeline from '../public/timeline.json';

export const Root: React.FC = () => (
  <Composition id="Explainer" component={Explainer} width={1080} height={1920} fps={30}
    durationInFrames={Math.ceil(timeline.duration * 30)} />
);
