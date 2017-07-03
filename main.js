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
  join("."), //D.M.YYYY w/
  reverse, // [D, M, YYYY]
  split("-"), // [YYYY, M ,D]
  compose(getDateString, getDate, getDay)
);

const main = day => {
  const fetch = futurize(Future)(execFile);
  const appendToFile = futurize(Future)(appendFile);
  const urlQs = composeQs(day);
  const queryDate = compose(getDate, getDay);

  fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", urlQs])
    .map(cheerio.load)
    .map(dom => dom(".fareOutput").text().toString())
    .map(split(/\sEUR/g))
    .map(filter(compose(not, isEmpty)))
    .map(map(replace(",", ".")))
    .map(map(Number))
    .map(prepend(new Date(queryDate(day)).toISOString()))
    .map(prepend(new Date().toISOString()))
    .map(join(","))
    .chain(str => appendToFile("railPrices.csv", str + "\n"))
    .fork(console.error, _ => console.log("success"));
};

const randomMs = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function run(day) {
  main(day);
  await sleep(randomMs(60000, 300000));
  if (day < 20) run(day + 1);
})(0);
