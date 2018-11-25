const fs = require("fs");
const dataDir = "./data/";

const compareData = async jsonData => {
  console.log("Init compareData");
  let result = "ERROR";
  try {
    let newFilename = dataDir + "data_" + dateToYMDhms(new Date()) + ".json";
    let lastFilename = getLastFile(dataDir);
    if (lastFilename && lastFilename !== "") {
      let dataStr = fs.readFileSync(dataDir + lastFilename);
      var previousData = JSON.parse(dataStr);
      if (dataStr.toString() === JSON.stringify(jsonData)) {
        // if (jsonData === previousData) {
        console.log("Equal data");
        result = "EQUAL";
      } else {
        console.log("Different data");
        await saveData(jsonData, newFilename);
        result = "DIFFERENT";
      }
    } else {
      console.log("Cannot get last file");
      await saveData(jsonData, newFilename);
      result = "FIRST";
    }
  } catch (err) {
    console.log(err);
    result = "ERROR";
  } finally {
    return result;
  }
};

const dateToYMDhms = date => {
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  var h = date.getHours();
  var mi = date.getMinutes();
  var s = date.getSeconds();
  return (
    "" +
    y +
    (m <= 9 ? "0" + m : m) +
    (d <= 9 ? "0" + d : d) +
    (h <= 9 ? "0" + h : h) +
    (mi <= 9 ? "0" + mi : mi) +
    (s <= 9 ? "0" + s : s)
  );
};

function sortStringArrayDes(a, b) {
  if (a > b) return -1;
  else if (a < b) return 1;
  else return 0;
}

const getLastFile = dir => {
  console.log("Init getLastFile");
  try {
    //Create dir if not exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    var files = fs.readdirSync(dir);
    if (files && files.length > 0) {
      console.log("fu:" + files);
      files.sort(sortStringArrayDes);
      console.log(files[0]);
      return files[0];
    } else {
      console.log("6");
      return "";
    }
  } catch (err) {
    console.log(err);
    return "";
  }
};

var saveData = (data, filename) => {
  console.log("Init saveData");
  fs.writeFileSync(filename, JSON.stringify(data));
};

module.exports = {
  compareData
};
