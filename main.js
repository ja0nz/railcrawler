const execFile = require("child_process").execFile;
const CHROMIUM = "/usr/bin/chromium";
const cheerio = require("cheerio");
import { bahnQs } from "./queryString";
import { futurize } from "futurize";
import { appendFile } from "fs";
import { Future } from "ramda-fantasy";
import {
  replace,
  join,
  map,
  compose,
  split,
  reverse,
  isEmpty,
  filter,
  not,
  prepend
} from "ramda";

const getDay = x => x * 86400000 + Date.now();
const getDate = x => new Date(x);
const getDateString = x => x.toLocaleDateString();

const composeQs = compose(
  bahnQs,
  join(".") /* D.M.YYYY */,
  reverse /* [D, M, YYYY] */,
  split("-") /* [YYYY, M ,D] */,
  compose(getDateString, getDate, getDay)
);

const main = day => {
  const fetch = futurize(Future)(execFile);
  const appendToFile = futurize(Future)(appendFile);
  const urlQs = composeQs(day);
  const queryDate = compose(getDate, getDay);

  fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", urlQs])
    .map(cheerio.load) /* DOM parser */
    .map(dom => dom(".fareOutput").text().toString()) /* fetch innerHTML */
    .map(split(/\sEUR/g)) /* split to list */
    .map(filter(compose(not, isEmpty))) /* filter empty */
    .map(map(replace(",", "."))) /* replace comma */
    .map(map(Number)) /* parse to number */
    .map(
      prepend(new Date(queryDate(day)).toISOString())
    ) /* prepend queryDate */
    .map(prepend(new Date().toISOString())) /* prepend currentDate */
    .map(join(",")) /* join to CSV */
    .chain(s => appendToFile("railPrices.csv", s + "\n")) /* append to file */
    .fork(console.error, _ => console.log("success"));
};

const randomMs = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function run(day) {
  main(day);
  await sleep(randomMs(60000, 300000));
  if (day < 30) run(day + 1);
})(0);
