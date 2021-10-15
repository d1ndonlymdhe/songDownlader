const { SponsorBlock } = require("sponsorblock-api");
const userID =
  "6159744b8f817ea28eb1ee3df8d89a98bfb9731eaac47ea11ad53091f242d4be";
const sponsorBlock = new SponsorBlock(userID); // userID should be a locally generated uuid, save the id for future tracking of stats
const fs = require("fs");
const songName = "Bussiness";
const cmd = require("node-cmd");
const ffmpeg = require("ffmpeg");
const ytdl = require("ytdl-core");
const videoID = "nCg3ufihKyU";
const writeStream = fs.createWriteStream(`${songName}.mp3`);

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
stream.on("info", (info, format) => {
  console.log(info);
});
console.log(info());
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
        console.log(segments.length);
        cutSections = segments.map((s) => {
          return {
            startAt: Math.floor(s.startTime),
            duration: Math.floor(s.endTime) - Math.floor(s.startTime),
            endAt: Math.floor(s.endTime),
          };
        });

        // cmd.run(`ffmpeg -i ${songName}.mp3 -y ${songName}.m4a`, () => {
        //   hello();
        // });
        hello();
      });
    console.log("done");
  }
});

function hello() {
  let a = 0;
  lastCut = 0;
  fs.writeFile("temps.txt", "", (err) => {
    if (err) {
      console.log(err);
    }
  });
  for (let i = 0; i <= cutSections.length; i++) {
    let temp = `temp${a}.mp3`;
    if (i < cutSections.length) {
      console.log(i, cutSections[i]);
      let duration = cutSections[i].startAt - lastCut;
      console.log("duration = ", duration);
      if (duration > 0) {
        cmd.run(
          `ffmpeg -i ${songName}.mp3 -ss ${lastCut} -t ${duration} -y ${temp}`,
          (err, data, stderr) => {
            console.log(err);
            // console.log(data);
            console.log(stderr);
          }
        );

        fs.appendFile("temps.txt", `file ${temp} \n`, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      lastCut = cutSections[i].endAt;
    } else {
      let duration = Math.floor(vidLength - lastCut);
      console.log(duration, vidLength, lastCut);
      if (duration > 0) {
        cmd.run(
          `ffmpeg -i ${songName}.mp3 -ss ${lastCut} -t ${duration} -y ${temp}`,
          (err, data, stderr) => {
            console.log(err);
            console.log(stderr);
          }
        );
        fs.appendFile("temps.txt", `file ${temp} \n`, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
    }
    a++;
  }
  cmd.run(
    `ffmpeg -f concat -i temps.txt -c copy -y ${songName}.mp3`,
    (err, data, stderr) => {
      console.log(err);
      // console.log(data);
      console.log(stderr);
    }
  );
}
