const ytdl = require('ytdl-core');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());

app.get('/stream/:id', async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const isValid = ytdl.validateID(videoId);

    if (!isValid) {
      throw new Error();
    }

    const videoInfo = await ytdl.getInfo(videoId);
    let audioFormat = ytdl.chooseFormat(videoInfo.formats, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    const { itag, container, contentLength } = audioFormat;

    // define headers
    const rangeHeader = req.headers.range || null;
    const rangePosition = rangeHeader
      ? rangeHeader.replace(/bytes=/, '').split('-')
      : null;
    console.log(`rangePosition`, rangePosition);
    const startRange = rangePosition ? parseInt(rangePosition[0], 10) : 0;
    const endRange =
      rangePosition && rangePosition[1].length > 0
        ? parseInt(rangePosition[1], 10)
        : contentLength - 1;
    const chunksize = endRange - startRange + 1;

    //         Send partial response
    res.writeHead(206, {
      'Content-Type': `audio/${container}`,
      'Content-Length': chunksize,
      'Content-Range':
        'bytes ' + startRange + '-' + endRange + '/' + contentLength,
      'Accept-Ranges': 'bytes',
    });

    const range = { start: startRange, end: endRange };
    const audioStream = ytdl(videoId, {
      filter: (format) => format.itag === itag,
      range,
    });
    audioStream.pipe(res);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
});

app.get('/getVideoInfo/:id', async (req, res) => {
  const videoId = req.params.id;
  try {
    const youtubeRes = await ytdl.getInfo(videoId, { filter: 'audioonly' });

    if (youtubeRes) {
      const audioInfo = youtubeRes.formats.find(
        (format) => format.hasAudio && format.container === 'mp4'
      );

      const videoInfo = youtubeRes.videoDetails;

      const videoRes = {
        audio: { url: audioInfo?.url },
        audioTest: {},
        videoTitle: videoInfo.title,
        videoURL: videoInfo.video_url,
        keywords: videoInfo.keywords,
        thumbnail: videoInfo.thumbnails[videoInfo.thumbnails.length - 1 || 0],
        category: videoInfo.category,
        videoChannelId: videoInfo.author.id,
        videoChannel: videoInfo.author.name,
        videoChannelThumbnail:
          videoInfo.author.thumbnails[
            videoInfo.author.thumbnails.length - 1 || 0
          ],
      };
      res.status(200).json({
        success: true,
        data: { ...videoRes },
        message: 'Song info fetched successfully.',
      });
    } else {
      res.status(404).json({
        success: false,
        data: null,
        message: 'Unable to get song details!!!',
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
});

const PORT = process.env.PORT || 7999;

app.listen(PORT, console.log(`Youtube service is running on PORT ${PORT}`));
