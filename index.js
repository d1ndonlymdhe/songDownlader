const { SponsorBlock } = require("sponsorblock-api");
const userID =
  "6159744b8f817ea28eb1ee3df8d89a98bfb9731eaac47ea11ad53091f242d4be";
const sponsorBlock = new SponsorBlock(userID); // userID should be a locally generated uuid, save the id for future tracking of stats
const fs = require("fs");

const cmd = require("node-cmd");
const ytdl = require("ytdl-core");

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.get("/download", (req, res) => {
  const { link, songName } = req.query;
  let temps = [];
  let cutSections = [];
  console.log(link, songName);
  const videoID = youtube_parser(link);
  download(res, req, videoID, songName);
});
app.listen(port);

function download(res, req, videoID, songName) {
  const writeStream = fs.createWriteStream(`${songName}.mp3`);
  let stream = ytdl(`https://youtube.com/watch?v=${videoID}`, {
    filter: "audioonly",
  });
  stream.pipe(writeStream);
  let vidLength;
  let info = async () => {
    inf = await ytdl.getInfo(`https://youtube.com/watch?v=${videoID}`);
    vidLength = inf.videoDetails.lengthSeconds;
    console.log(vidLength);
  };
  info();
  stream.on("progress", (length, current, total) => {
    const progress = Math.floor((current / total) * 100);
    console.log(`progress = ${progress} %`);
    if (progress == 100) {
      console.log(length);
      sponsorBlock
        .getSegments(videoID, [
          "intro",
          "outro",
          "interaction",
          "music_offtopic",
          "preview",
          "sponsor",
        ])
        .then((segments) => {
          console.log(segments);
          console.log(segments.length);
          cutSections = segments.map((s) => {
            return {
              startAt: Math.floor(s.startTime),
              duration: Math.floor(s.endTime) - Math.floor(s.startTime),
              endAt: Math.floor(s.endTime),
            };
          });

          fs.writeFile("temps.txt", "", () => {
            console.log("file created");
          });
          newFunc(res, req, cutSections, 0, vidLength, 0, []);
        });
      console.log("done");
    }
  });
  function newFunc(res, req, cutSections, lastCut, vidLength, depth, temps) {
    console.log("depth = ", depth);
    const temp = `temp${depth}.mp3`;
    if (depth < cutSections.length) {
      const duration = cutSections[depth].startAt - lastCut;
      if (duration > 0) {
        console.log(
          `lastcut = ${lastCut} duration = ${duration} temp = ${temp}`
        );
        let command = `ffmpeg -i "${songName}.mp3" -ss ${lastCut} -t ${duration} -y ${temp}`;
        cmd.run(command, (err, data, stderr) => {
          console.log(command);
          console.log(err);
          console.log(data);
          console.log(stderr);
          lastCut = cutSections[depth].endAt;
          depth++;
          newFunc(res, req, cutSections, lastCut, vidLength, depth, temps);
        });

        fs.appendFile("temps.txt", `file ${temp} \n`, () => {
          temps.push(temp);
          console.log("appended");
        });
      } else {
        lastCut = cutSections[depth].endAt;
        depth++;
        newFunc(res, req, cutSections, lastCut, vidLength, depth, temps);
      }
    } else {
      const duration = vidLength - lastCut;
      if (duration > 0) {
        console.log(
          `lastcut = ${lastCut} duration = ${duration} temp = ${temp}`
        );
        let command = `ffmpeg -i "${songName}.mp3" -ss ${lastCut} -t ${duration} -y ${temp}`;
        cmd.run(command, (err, data, stderr) => {
          console.log(command);
          console.log(err);
          console.log(data);
          console.log(stderr);
          fs.appendFile("temps.txt", `file ${temp} \n`, () => {
            console.log("appended");
            temps.push(temp);
          });
          cmd.run(
            `ffmpeg -f concat -i temps.txt -c copy -y "${songName}.mp3"`,
            (err, data, stderr) => {
              console.log(err);
              console.log(data);
              console.log(stderr);
              temps.forEach((temp) => {
                fs.unlink(temp, () => {
                  console.log("deleted ", temp);
                });
              });
              fs.unlink("temps.txt", () => {
                console.log("deleted txt");
              });
              forDownload(res, req, songName);
            }
          );
        });
      } else {
        cmd.run(
          `ffmpeg -f concat -i temps.txt -c copy -y "${songName}.mp3"`,
          (err, data, stderr) => {
            console.log("merging");

            console.log(err);
            console.log(data);
            console.log(stderr);
            temps.forEach((temp) => {
              fs.unlink(temp, () => {
                console.log("deleted ", temp);
              });
            });
            fs.unlink("temps.txt", () => {
              console.log("deleted txt");
            });
            forDownload(res, req, songName);
          }
        );
      }
    }
  }
}

function forDownload(res, req, songName) {
  const file = `${__dirname}/${songName}.mp3`;
  res.setHeader("Content-disposition", `attachment; filename=${songName}.mp3`);
  res.setHeader("Content-type", "audio/mpeg");
  res.download(file);
  setTimeout(() => {
    fs.unlink(file, () => console.log(`${file} deleted`));
  }, 5000);
}

function youtube_parser(url) {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return match && match[7].length == 11 ? match[7] : false;
}
