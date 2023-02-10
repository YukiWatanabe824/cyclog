class CyclingLog {
  constructor() {
    this.storageFile = new StorageFile();
  }

  async saveNewLog(log) {
    const newLog = await this.createNewLog(log);
    await this.storageFile.save(newLog);
    console.log("ログを保存しました");
  }

  async createNewLog(log) {
    let cyclingLogs = this.storageFile.read();
    let maxId;

    [cyclingLogs, maxId] = this.firstLogOrNot(cyclingLogs, maxId);
    const date = new Date();
    cyclingLogs.push({
      id: maxId + 1,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      date: date.getDate(),
      goal: log.goal,
      distance: parseInt(log.distance.replace(/[^0-9]/g, "")),
      comment: log.comment,
    });

    return cyclingLogs;
  }

  firstLogOrNot(cyclingLogs, maxId) {
    if (cyclingLogs === "") {
      cyclingLogs = [];
      maxId = 0;
    } else {
      maxId = Math.max(...cyclingLogs.map((p) => p.id));
    }
    return [cyclingLogs, maxId];
  }

  logSum() {
    const cyclingLogs = this.storageFile.read();
    const totalDistance = cyclingLogs.reduce((sum, i) => sum + i.distance, 0);
    const rideCount = cyclingLogs.map((p) => p.id).length;
    const visitedCount = [...new Set(cyclingLogs.map((p) => p.goal))].length;

    return [totalDistance, rideCount, visitedCount];
  }

  filteringDate(selectYear, selectMonth) {
    let cyclingLogs = this.storageFile.read();
    cyclingLogs = cyclingLogs.filter(
      (p) => p.year === selectYear && p.month === selectMonth
    );
    return cyclingLogs;
  }
}

class StorageFile {
  read() {
    const { readFileSync } = require("node:fs");
    this.checkExistMemosFile();
    const cyclingLogs = readFileSync("./cyclingLog.json", "utf8");
    if (cyclingLogs === "") {
      return cyclingLogs;
    } else {
      return JSON.parse(cyclingLogs);
    }
  }

  checkExistMemosFile() {
    const fs = require("node:fs");
    const paths = fs.readdirSync("./");
    paths.find((path) => path === "cyclingLog.json")
      ? undefined
      : fs.writeFileSync("cyclingLog.json", "");
  }

  async save(data) {
    data = JSON.stringify(data);
    const { writeFile } = require("node:fs/promises");
    const promise = writeFile("cyclingLog.json", data);
    return promise;
  }

  async delete(logId) {
    const cyclingLogs = this.read();
    if (cyclingLogs === "") {
      console.log("ログが存在しません");
      return;
    }

    const newcyclingLogs = cyclingLogs.filter(
      (cyclingLog) => cyclingLog.id != logId
    );
    await this.save(newcyclingLogs);
    console.log("ログを削除しました");
  }
}

class UserInterFace {
  async firstQuestion() {
    const { Select } = require("enquirer");
    const prompt = new Select({
      name: "choice",
      message: "ようこそサイクログへ！ アクションを選んでください",
      choices: [
        "ログをつける",
        "過去の合計値を見る",
        "ログを見る",
        "ログを削除する",
      ],
    });
    return prompt.run();
  }

  writeLog() {
    const { Form } = require("enquirer");

    const prompt = new Form({
      name: "cyclinglog",
      message: "サイクリングの記録をつけましょう",
      choices: [
        { name: "goal", message: "行き先" },
        { name: "distance", message: "走行距離(km)" },
        { name: "comment", message: "感想" },
      ],
    });
    return prompt.run();
  }

  async yearSlect() {
    const storagefile = new StorageFile();
    let cyclingLogs = storagefile.read();
    const { Select } = require("enquirer");
    const prompt = new Select({
      name: "selectyear",
      message: "表示する年を選んでください",
      choices: [...new Set(cyclingLogs.map((p) => p.year.toString()))],
    });
    return prompt.run();
  }

  async monthSlect(selectYear) {
    const storagefile = new StorageFile();
    let filteredYearcyclingLogs = storagefile
      .read()
      .filter((value) => value.year === parseInt(selectYear));
    const { Select } = require("enquirer");
    const prompt = new Select({
      name: "selectmonth",
      message: "表示する月を選んでください",
      choices: [
        ...new Set(filteredYearcyclingLogs.map((p) => p.month.toString())),
      ],
    });
    return prompt.run();
  }

  async destroyLogSelect(dateFilteredLogs) {
    const outlineAndId = dateFilteredLogs.map((p) => ({
      message: `  ${p.year}年${p.month}月${p.date}日 行き先:${p.goal} 走行距離:${p.distance}km コメント:${p.comment}`,
      value: p.id,
    }));

    const { Select } = require("enquirer");
    const prompt = new Select({
      name: "selectlog",
      message: "削除するログを選んでください",
      choices: outlineAndId,
    });
    return prompt.run();
  }
}

class CyclogDirecter {
  constructor() {
    this.log = new CyclingLog();
    this.storageFile = new StorageFile();
    this.userInterFace = new UserInterFace();
  }
  async main() {
    const userChoice = await this.userInterFace.firstQuestion();

    if (userChoice === "ログをつける") {
      const newLog = await this.userInterFace.writeLog();
      this.log.saveNewLog(newLog);
    } else if (userChoice === "過去の合計値を見る") {
      this.pastLogTotal();
    } else if (userChoice === "ログを見る") {
      this.viewLog();
    } else if (userChoice === "ログを削除する") {
      const deleteLogId = await this.userInterFace.destroyLogSelect(await this.getYearAndMonthFilterdLog());
      this.storageFile.delete(deleteLogId);
    } else {
      console.log("Illegal Choice");
    }
  }

  async viewLog() {
    const dateFilteredLogs = await this.getYearAndMonthFilterdLog();
    for (const dateFilteredLog in dateFilteredLogs) {
      console.log(
        `  ${dateFilteredLogs[dateFilteredLog].year}年${dateFilteredLogs[dateFilteredLog].month}月${dateFilteredLogs[dateFilteredLog].date}日 行き先:${dateFilteredLogs[dateFilteredLog].goal} 走行距離:${dateFilteredLogs[dateFilteredLog].distance}km コメント:${dateFilteredLogs[dateFilteredLog].comment}`
      );
    }
  }

  pastLogTotal() {
    let totalDistance, rideCount, visitedCount;
    [totalDistance, rideCount, visitedCount] = this.log.logSum();

    console.log(`総距離: ${totalDistance}km走りました！`);
    console.log(`ライド数: ${rideCount}回サイクリングを楽しみました！`);
    console.log(`行った場所: ${visitedCount}箇所も巡りました！`);
  }

  async getYearAndMonthFilterdLog() {
    const selectYear = await this.userInterFace.yearSlect();
    const selectMonth = await this.userInterFace.monthSlect(selectYear);
    return this.log.filteringDate(parseInt(selectYear), parseInt(selectMonth));
  }
}

exports.cyclogDirecter = () => {
  return new CyclogDirecter()
}
