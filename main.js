const execFile = require("child_process").execFile;
const CHROMIUM = "/usr/bin/chromium";
const cheerio = require("cheerio");
import { bahnQs } from "./queryString";
import { futurize } from "futurize";
import { appendFile } from "fs";
import { Future } from "ramda-fantasy";
const fetch = futurize(Future)(execFile);
const appendToFile = futurize(Future)(appendFile);
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
const queryDate = compose(getDate, getDay);

const composeQs = compose(
  bahnQs,
  join("."),
  reverse,
  split("-"),
  compose(getDateString, getDate, getDay)
);

const main = day => {
  fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", composeQs(day)])
    .map(cheerio.load)
    .map(dom => dom(".fareOutput").text().toString())
    .map(split(/\sEUR/g))
    .map(filter(compose(not, isEmpty)))
    .map(map(replace(",", ".")))
    .map(map(Number))
    .map(prepend(new Date(queryDate(day)).toISOString()))
    .map(prepend(new Date().toISOString()))
    .map(join(","))
    .chain(s => appendToFile("railPrices.csv", s + "\n"))
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
