import { futurize } from "futurize";
import { appendFile } from "fs";
import { bahnQs } from "./queryString";
import { Future } from "ramda-fantasy";
const execFile = require("child_process").execFile;
const CHROMIUM = "/usr/bin/chromium";
const cheerio = require("cheerio");
const Result = require("folktale/result");
const fetch = futurize(Future)(execFile);
const appendToFile = futurize(Future)(appendFile);
import {
  curry,
  replace,
  join,
  map,
  flip,
  flatten,
  compose,
  split,
  invoker,
  identity,
  filter,
  prepend
} from "ramda";

/* Fix for 'toLocaleDateString' because node yet cant parse locals accordingly*/
Date.prototype.toLocaleDateStringDE = function() {
  return `${this.getDate()}.${this.getMonth() + 1}.${this.getFullYear()}`;
};
/* Fix end */

const getDay = x => x * 86400000 + Date.now(),
  getDate = x => new Date(x),
  queryDate = compose(getDate, getDay),
  composeQs = compose(
    bahnQs,
    invoker(0, "toLocaleDateStringDE"),
    getDate,
    getDay
  );

const parse = dom => {
  const $ = cheerio.load(dom);
  return $(".firstrow").map((_, e) => {
    const isEmpty = v => v || null;
    const queryHelper = curry((x, y) => $(".fareOutput", x, y));
    const seq = map(
      compose(
        Result.fromNullable,
        isEmpty,
        invoker(0, "text"),
        flip(queryHelper)(e)
      )
    );

    const [red, std] = seq([".farePep", ".fareStd"]);
    return std.map(b => [red.getOrElse(b), b]).fold(console.error, v => v);
  });
};

const main = (day, total) =>
  fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", composeQs(day)])
    .map(compose(invoker(0, "get"), parse))
    .map(map(compose(filter(identity), split(/\sEUR/g))))
    .map(flatten)
    .map(map(compose(Number, replace(",", "."))))
    .map(prepend(new Date(queryDate(day)).toISOString()))
    .map(prepend(new Date().toISOString()))
    .map(join(","))
    .chain(s => appendToFile("railPrices.csv", s + "\n"))
    .fork(console.error, _ =>
      console.log(`Finished around ${Number(100 / total * day).toFixed(2)} %`)
    );

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  randomMs = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

(async function run(day, total) {
  main(day, total);
  await sleep(randomMs(60000, 300000));
  if (day < total) run(day + 1, total);
})(0, 30);
