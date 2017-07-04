const execFile = require("child_process").execFile;
const CHROMIUM = "/usr/bin/chromium";
const cheerio = require("cheerio");
const Result = require("folktale/result");
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
  flatten,
  compose,
  split,
  reverse,
  invoker,
  identity,
  filter,
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

const parse = dom => {
  const $ = cheerio.load(dom);
  return $(".firstrow").map((_, e) => {
    const isEmpty = v => (v ? v : null);
    const seq = map(x =>
      Result.fromNullable(isEmpty($(".fareOutput", x, e).text()))
    );

    const [red, std] = seq([".farePep", ".fareStd"]);
    return std.map(b => [red.getOrElse(b), b]).fold(console.error, v => v);
  });
};

const randomMs = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const main = day => {
  fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", composeQs(day)])
    .map(compose(invoker(0, "get"), parse))
    .map(map(compose(filter(identity), split(/\sEUR/g))))
    .map(flatten)
    .map(map(compose(Number, replace(",", "."))))
    .map(prepend(new Date(queryDate(day)).toISOString()))
    .map(prepend(new Date().toISOString()))
    .map(join(","))
    .chain(s => appendToFile("railPrices.csv", s + "\n"))
    .fork(console.error, i => console.log(i));
};

(async function run(day) {
  main(day);
  await sleep(randomMs(60000, 300000));
  if (day < 30) run(day + 1);
})(0);
