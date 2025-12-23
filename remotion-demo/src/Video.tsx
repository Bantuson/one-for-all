import React from 'react';
import { Composition, Sequence } from 'remotion';
import {
  TitleSlide,
  Problem1Slide,
  Problem2Slide,
  InsightSlide,
  SolutionStudentSlide,
  SolutionInstitutionSlide,
  HowItWorksSlide,
  TechStackSlide,
  MarketSlide,
  BusinessModelSlide,
  TeamSlide,
  AskSlide,
} from './slides';
import { video } from './theme';

// Slide durations in frames (at 30fps) - Total: ~106 seconds = 3180 frames
const SLIDE_DURATIONS = {
  title: 180,             // 6s
  problem1: 300,          // 10s (human story)
  problem2: 270,          // 9s (system bottlenecks)
  insight: 240,           // 8s
  solutionStudent: 270,   // 9s
  solutionInstitution: 270, // 9s
  howItWorks: 330,        // 11s
  techStack: 240,         // 8s
  market: 270,            // 9s
  businessModel: 270,     // 9s
  team: 240,              // 8s
  ask: 300,               // 10s
};

// Total duration calculation
const TOTAL_DURATION = Object.values(SLIDE_DURATIONS).reduce((a, b) => a + b, 0);

export const RemotionVideo: React.FC = () => {
  return (
    <>
      {/* Individual slide compositions for preview */}
      <Composition
        id="TitleSlide"
        component={TitleSlide}
        durationInFrames={SLIDE_DURATIONS.title}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="Problem1Slide"
        component={Problem1Slide}
        durationInFrames={SLIDE_DURATIONS.problem1}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="Problem2Slide"
        component={Problem2Slide}
        durationInFrames={SLIDE_DURATIONS.problem2}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="InsightSlide"
        component={InsightSlide}
        durationInFrames={SLIDE_DURATIONS.insight}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="SolutionStudentSlide"
        component={SolutionStudentSlide}
        durationInFrames={SLIDE_DURATIONS.solutionStudent}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="SolutionInstitutionSlide"
        component={SolutionInstitutionSlide}
        durationInFrames={SLIDE_DURATIONS.solutionInstitution}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="HowItWorksSlide"
        component={HowItWorksSlide}
        durationInFrames={SLIDE_DURATIONS.howItWorks}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="TechStackSlide"
        component={TechStackSlide}
        durationInFrames={SLIDE_DURATIONS.techStack}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="MarketSlide"
        component={MarketSlide}
        durationInFrames={SLIDE_DURATIONS.market}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="BusinessModelSlide"
        component={BusinessModelSlide}
        durationInFrames={SLIDE_DURATIONS.businessModel}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="TeamSlide"
        component={TeamSlide}
        durationInFrames={SLIDE_DURATIONS.team}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
      <Composition
        id="AskSlide"
        component={AskSlide}
        durationInFrames={SLIDE_DURATIONS.ask}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />

      {/* Full pitch deck composition */}
      <Composition
        id="PitchDeck"
        component={PitchDeck}
        durationInFrames={TOTAL_DURATION}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
    </>
  );
};

// Full pitch deck with all 12 slides in sequence
const PitchDeck: React.FC = () => {
  let currentFrame = 0;

  const slides = [
    { Component: TitleSlide, duration: SLIDE_DURATIONS.title },
    { Component: Problem1Slide, duration: SLIDE_DURATIONS.problem1 },
    { Component: Problem2Slide, duration: SLIDE_DURATIONS.problem2 },
    { Component: InsightSlide, duration: SLIDE_DURATIONS.insight },
    { Component: SolutionStudentSlide, duration: SLIDE_DURATIONS.solutionStudent },
    { Component: SolutionInstitutionSlide, duration: SLIDE_DURATIONS.solutionInstitution },
    { Component: HowItWorksSlide, duration: SLIDE_DURATIONS.howItWorks },
    { Component: TechStackSlide, duration: SLIDE_DURATIONS.techStack },
    { Component: MarketSlide, duration: SLIDE_DURATIONS.market },
    { Component: BusinessModelSlide, duration: SLIDE_DURATIONS.businessModel },
    { Component: TeamSlide, duration: SLIDE_DURATIONS.team },
    { Component: AskSlide, duration: SLIDE_DURATIONS.ask },
  ];

  return (
    <>
      {slides.map(({ Component, duration }, index) => {
        const from = currentFrame;
        currentFrame += duration;
        return (
          <Sequence key={index} from={from} durationInFrames={duration}>
            <Component />
          </Sequence>
        );
      })}
    </>
  );
};
