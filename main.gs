var apiKey = "KUCOIN-API-KEY-HERE";
var apiSecret = "KUCOIN-API-SECRET-HERE";
var apiPassphrase = "KUCOIN-API-PASSPHRASE-HERE";

function getLendingRates() {
  var url = "https://api.kucoin.com/api/v1/margin/market?currency=USDT";

  var now = new Date().getTime();
  var strToSign = now.toString() + "GET" + "/api/v1/margin/market";
  var signature = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(apiSecret, strToSign)
  );
  var passphrase = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(apiSecret, apiPassphrase)
  );

  var headers = {
    "KC-API-SIGN": signature,
    "KC-API-TIMESTAMP": now.toString(),
    "KC-API-KEY": apiKey,
    "KC-API-PASSPHRASE": passphrase,
    "KC-API-KEY-VERSION": 2,
    "Content-Type": "application/json",
  };

  var options = {
    "method": "get",
    "contentType": "application/json",
    "headers": headers
  };

  var response = UrlFetchApp.fetch(url, options);
  var parse = JSON.parse(response.getContentText());
  if (parse["code"] == "200000") {
    var depthRates = {100: 0, 1000: 0, 10000: 0, 100000: 0, 1000000: 0, 10000000: 0};
    var numerator = 0;
    var denominator = 0;
    for (var order in parse["data"]) {
      var orderSize = parseInt(parse["data"][order]["size"])
      var orderIntRate = parseFloat(parse["data"][order]["dailyIntRate"])
      for (var depth in depthRates) {
        if (denominator + orderSize <= depth) {
          depthRates[depth] = (36500 * (numerator + (orderSize * orderIntRate)) / (denominator + orderSize)).toFixed(2);
        } else if (depth - denominator > 0) {
          depthRates[depth] = (36500 * (numerator + ((depth - denominator) * orderIntRate)) / depth).toFixed(2);
        }
      }
      numerator += (orderSize * orderIntRate);
      denominator += orderSize;
    };
    return depthRates;
  } else {
    Logger.log("Response error code" + parse["code"])
  }
}

function getCellRangeByColumnName(sheet, columnName, row) {
  let data = sheet.getDataRange().getValues();
  let column = data[0].indexOf(columnName);
  if (column != -1) {
    return sheet.getRange(row, column + 1, 1, 1);
  }
}

function recordLendingRates() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet  = spreadsheet.getSheetByName("USDT");
  var depthRates = getLendingRates();
  var lastRow = sheet.getLastRow()+1;
  getCellRangeByColumnName(sheet, "Time", lastRow).setValue(Date())
  for (depth in depthRates) {
    getCellRangeByColumnName(sheet, parseInt(depth), lastRow).setValue(depthRates[depth]);
  }
}