const { Builder, By, Key, until } = require("selenium-webdriver");
const axios = require("axios");
const config = require("./config.js");
const controls = require("./controls.js");

var driver;

const onlyAlphanumerics = str => {
  var result = "";
  var code, i, len;
  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (code >= 0 && code <= 31) continue;
    else result = result + str[i];
    return result;
  }
  return true;
};

const selectItemByText = async (element, itemText, onlyAlpha = false) => {
  var result = {
    status: "ERROR",
    reason: ""
  };

  try {
    var dropdown_list = await driver.findElement(element);
    if (dropdown_list) {
      var options = await dropdown_list.findElements(By.tagName("option"));
      if (options) {
        for (var i = 0, len = options.length; i < len; i++) {
          var optionText = await options[i].getText();
          //Remove non printable characters
          if (onlyAlpha) {
            optionText = onlyAlphanumerics(optionText);
            itemText = onlyAlphanumerics(itemText);
          }

          if (optionText === itemText) {
            options[i].click();
            result.status = "OK";
            result.reason = "";
            break;
          }
        }
        if (result.status !== "OK") result.reason = "Item not found";
      } else {
        result.reason = "List has no options";
      }
    } else {
      result.reason = "Control not found.";
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`${result.status}: ${result.reason}`);
    return result;
  }
};

(async function example() {
  try {
    //Init driver
    driver = await new Builder().forBrowser(config.browser).build();
    //Open page
    await driver.get(
      "file:///home/yet88/Develop/Node.js/Projects/selenium-extranjeria/test1.html"
    );

    await driver
      .manage()
      .window()
      .maximize();

    let region = config.location.split(":")[0];
    let comune = config.location.split(":")[1];
    //var dropdown_list = await driver.findElement(controls.cmbRegiones);
    var result = await selectItemByText(controls.cmbRegiones, region);
    if (result.status === "OK")
      result = await selectItemByText(controls.cmbComunas, comune);
    if (result.status === "OK")
      result = await selectItemByText(
        controls.cmbTramites,
        config.procedureName,
        true
      );
    var json = `[{"color":"red","description":null,"end":"2018-11-26T08:15:00","id":-1,"idCita":0,"start":"2018-11-26T08:00:00","textColor":"white","title":"No Disponible"},{"color":"red","description":null,"end":"2018-11-26T08:30:00","id":-1,"idCita":0,"start":"2018-11-26T08:15:00","textColor":"white","title":"No Disponible"},{"color":"red","description":null,"end":"2018-11-26T08:45:00","id":-1,"idCita":0,"start":"2018-11-26T08:30:00","textColor":"white","title":"No Disponible"}]`;
    console.log(JSON.parse(json));

    //await openDataPage();
  } catch (error) {
    console.log(error);
  } finally {
    //await driver.quit();
  }
})();

const goToTab = async tabIdx => {
  try {
    var tabs = await driver.getAllWindowHandles();
    if (tabs.length >= tabIdx + 1) {
      await driver.switchTo().window(tabs[tabIdx]); //switches to tab
      return true;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

const refreshPage = async () => {
  await driver.navigate().refresh();
};

const openDataPage = async () => {
  await driver.executeScript("window.open()");
  var tabs = await driver.getAllWindowHandles();
  console.log(tabs);
  await driver.switchTo().window(tabs[1]); //switches to new tab
  await driver.get(
    "file:///home/yet88/Develop/Node.js/Projects/selenium-extranjeria/test2.html"
  );

  var ok = false;
  ok = await goToTab(0);
  await driver.sleep(config.longWait);
  ok = await goToTab(1);
  await driver.sleep(config.longWait);
  ok = await goToTab(0);
  if (ok) refreshPage();
};

const GetJSONData = async () => {
  const instance = axios.create({
    baseURL: config.urlData,
    timeout: 15000,
    headers: { "X-Custom-Header": "foobar" }
  });
  /*
  let requestParams = {
    data: []
  };
  let config = {
    headers: {
      use
      operatorCode: operatorCode
    }
  };
  */
  axios
    .get(config.urlData)
    .then(response => {
      if (response.data.includes("<html>")) {
        return null;
      } else {
        return data;
      }
      /*
    if (response.data.summary.totalResults === 0) {
      throw new Error("Unable to find that address.");
    }
*/
      console.log(response);
      //const weatherUrl = `https://api.darksky.net/forecast/${darkskyApiKey}/${lat},${lon}`;
      //return axios.get(weatherUrl);
    })
    .catch(function(error) {
      console.log(error);
    });
};
