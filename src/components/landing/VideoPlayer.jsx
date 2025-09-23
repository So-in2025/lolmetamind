'use client';
import React from 'react';
import YouTube from 'react-youtube';

const VideoPlayer = ({ videoId }) => {
  const opts = {
    playerVars: {
      autoplay: 1,
      controls: 0,
      loop: 1,
      playlist: videoId,
      mute: 1,
      modestbranding: 1,
      showinfo: 0,
      start: 0,
      fs: 0,
      iv_load_policy: 3
    },
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
        style={{
            width: '177.77777778vh',
            minWidth: '100%',
            minHeight: '56.25vw'
        }}
      />
    </div>
  );
};

export default VideoPlayer;