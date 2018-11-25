const { Builder, By, Key, until, Point } = require("selenium-webdriver");
const h2p = require("html2plaintext");
const fs = require("fs");
const config = require("./config.js");
const controls = require("./controls.js");
const comparer = require("./comparer.js");

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

const clickElement = async (
  element,
  waitForVisible = true,
  waitForEnabled = true
) => {
  var result = {
    status: "ERROR",
    reason: ""
  };
  try {
    if (waitForVisible)
      await driver.wait(
        until.elementIsVisible(driver.findElement(element)),
        config.timeoutWait
      );

    if (waitForEnabled)
      await driver.wait(
        until.elementIsEnabled(driver.findElement(element)),
        config.timeoutWait
      );

    var ctrl = await driver.findElement(element);
    if (ctrl) {
      ctrl.click();
      result.status = "OK";
    } else {
      result.reason = "Element not found.";
    }
  } catch (error) {
    console.log(error);
    result.reason = error.message;
  } finally {
    console.log(`Click ${result.status}: ${result.reason}`);
    return result;
  }
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
          if (onlyAlpha) {
            //Remove non printable characters
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
    result.reason = error.message;
  } finally {
    console.log(`Selection ${result.status}: ${result.reason}`);
    return result;
  }
};

init = async () => {
  //(async function example() {
  try {
    //Init driver
    driver = await new Builder().forBrowser(config.browser).build();

    //Open page
    await driver.get(config.url);
    //Maximize window
    await driver
      .manage()
      .window()
      .maximize();

    /** Step 1: Login **/
    console.log("Init Login");
    await driver
      .findElement(controls.txtUsername)
      .sendKeys(config.username, Key.TAB, config.password, Key.RETURN);
    /** End Login **/

    /** Step 2: Operation selection **/
    console.log("Init Operation Selection");
    await driver.sleep(config.shortWait); //Explicit wait for page loading
    await clickElement(controls.btnReservarHora);
    /** End Operation selection **/

    /** Step 3: Transaction selection **/
    console.log("Init Transaction Selection");
    //Begin dismiss info modal
    await driver.sleep(config.longWait); //Explicit wait for modal loading
    await clickElement(controls.btnCloseModalStep3);
    //End dismiss info modal
    //Begin Procedure selection
    let region = config.location.split(":")[0];
    let comune = config.location.split(":")[1];
    var resultStep3 = await selectItemByText(controls.cmbRegiones, region);
    if (resultStep3.status === "OK")
      resultStep3 = await selectItemByText(controls.cmbComunas, comune);
    if (resultStep3.status === "OK") {
      resultStep3 = await selectItemByText(
        controls.cmbTramites,
        config.procedureName,
        true
      );
    }
    if (resultStep3.status === "OK") {
      resultStep3 = await clickElement(controls.btnNextStep3, false, true);
    }
    //Begin Procedure selection
    /** End Transaction selection **/

    /** Step 4: Informative general background  **/
    console.log("Init Informative general background");
    await driver.sleep(config.longWait); //Explicit wait for page loading
    let result = await clickElement(controls.btnNextStep4, true, false);
    /** End Informative general background  **/

    /** Step 5: Requirement compliance **/
    await driver.sleep(config.longWait); //Explicit wait for page loading
    var resultStep5 = await clickElement(controls.RdBtnYesStep5);
    if (resultStep5.status === "OK")
      resultStep5 = await clickElement(controls.btnNextStep5);
    /** End Requirement compliance  **/

    /** Step 6: Transaction selection **/
    console.log("Init Transaction Selection");
    //Begin dismiss user data modal
    await driver.sleep(config.longWait); //Explicit wait for modal loading
    await clickElement(controls.btnCloseModalStep6);
    //End dismiss user data modal

    /** Open Data Page in another tab **/
    await driver.sleep(config.longWait); //Explicit wait for page loading
    if (await openDataPage()) {
      var res = await extractData();
      switch (res.status) {
        case "ERROR":
          console.log(`Error: ${res.data}`);
          return;
        case "OK":
          console.log("Keep going baby =>");
          //console.log(res.data);
          resultComp = await comparer.compareData(res.data);
          switch (resultComp) {
            case "ERROR":
              console.log("Error in comparation");
              return;
            case "EQUAL":
              console.log("Equal data. Nothing to do");
              return;
            case "DIFFERENT":
              console.log("Data has changed. Notify quickly");
              return;
            case "FIRST":
              console.log("Initial File created");
              return;
            default:
              return;
          }
          return;
        case "LOGIN":
          console.log("Go back");
          return;
        case "RETRY":
          console.log("Wait & Retry");
          return;
        default:
          return;
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    //await driver.quit();
  }
};
//})();

const extractData = async () => {
  var result = {
    status: "",
    data: ""
  };
  console.log("Init extractData");
  try {
    var source = await driver.getPageSource();
    if (source) {
      if (source.includes(config.noDataMsg)) {
        result.status = "RETRY";
      } else {
        if (
          source.includes(config.loginPageTitle) ||
          source.includes(config.expiredSession)
        ) {
          result.status = "LOGIN";
        } else {
          if (source.includes(config.htmlInJsonWrap)) source = h2p(source); //Extract JSON wrapped in HTTM page
          var days = JSON.parse(source);
          result.status = "OK";
          result.data = days;
        }
      }
    } else {
      result.status = "ERROR";
      result.data = "Source Undefined";
    }
  } catch (err) {
    result.status = "ERROR";
    result.data = err.message;
  } finally {
    return result;
  }
};

const openDataPage = async () => {
  console.log("Init openDataPage");
  try {
    await driver.executeScript("window.open()");
    await goToTab(1); //switches to new tab
    await driver.get(config.urlData);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const goToTab = async tabIdx => {
  console.log("Init goToTab");
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
  console.log("Init refreshPage");
  await driver.navigate().refresh();
};

init();
