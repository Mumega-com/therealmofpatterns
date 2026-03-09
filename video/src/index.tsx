import { Composition, registerRoot } from 'remotion';
import { HomepageVideo } from './HomepageVideo';
import { HomepageLandscape } from './HomepageLandscape';
import { DailyWeatherVideo, DEFAULT_WEATHER } from './DailyWeatherVideo';

export const RemotionRoot = () => {
  return (
    <>
      {/* 1080x1920 vertical — TikTok / Reels / Shorts */}
      <Composition
        id="HomepageVideo"
        component={HomepageVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* 1920x1080 landscape — web hero / YouTube */}
      <Composition
        id="HomepageLandscape"
        component={HomepageLandscape}
        durationInFrames={870}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 1080x1920 vertical — daily cosmic weather post (30s) */}
      <Composition
        id="DailyWeather"
        component={DailyWeatherVideo as any}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_WEATHER}
      />
    </>
  );
};

registerRoot(RemotionRoot);
