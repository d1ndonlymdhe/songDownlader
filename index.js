const { SponsorBlock } = require("sponsorblock-api");
const userID =
  "6159744b8f817ea28eb1ee3df8d89a98bfb9731eaac47ea11ad53091f242d4be";
const sponsorBlock = new SponsorBlock(userID); // userID should be a locally generated uuid, save the id for future tracking of stats
const fs = require("fs");
const songName = "Alors on Dance";
const cmd = require("node-cmd");
const ytdl = require("ytdl-core");
const videoID = "fzQ6gRAEoy0";
const writeStream = fs.createWriteStream(`${songName}.mp3`);
let temps = [];

let cutSections = [];

fs.open(`${"he"}.mp3`, () => {});
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
// stream.on("info", (info, format) => {
//   console.log(info);
// });
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
        newFunc(cutSections, 0, vidLength, 0);
      });
    console.log("done");
  }
});
function newFunc(cutSections, lastCut, vidLength, depth) {
  console.log("depth = ", depth);
  const temp = `temp${depth}.mp3`;
  if (depth < cutSections.length) {
    const duration = cutSections[depth].startAt - lastCut;
    if (duration > 0) {
      console.log(`lastcut = ${lastCut} duration = ${duration} temp = ${temp}`);
      let command = `ffmpeg -i "${songName}.mp3" -ss ${lastCut} -t ${duration} -y ${temp}`;
      cmd.run(command, (err, data, stderr) => {
        console.log(command);
        console.log(err);
        console.log(data);
        console.log(stderr);
        lastCut = cutSections[depth].endAt;
        depth++;
        newFunc(cutSections, lastCut, vidLength, depth);
      });

      fs.appendFile("temps.txt", `file ${temp} \n`, () => {
        temps.push(temp);
        console.log("appended");
      });
    } else {
      lastCut = cutSections[depth].endAt;
      depth++;
      newFunc(cutSections, lastCut, vidLength, depth);
    }
  } else {
    const duration = vidLength - lastCut;
    if (duration > 0) {
      console.log(`lastcut = ${lastCut} duration = ${duration} temp = ${temp}`);
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
        }
      );
    }
  }
}
