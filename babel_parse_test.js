const parser = require("@babel/parser");
const fs = require("fs");
const code = fs.readFileSync("C:/Users/flav8/AppData/Local/Temp/zest_parse_test.jsx", "utf8");
console.log("Code length:", code.length);
try {
  parser.parse(code, { plugins: ["jsx"], sourceType: "script" });
  console.log("PARSE OK");
} catch(e) {
  console.log("PARSE ERROR:", e.message);
  if(e.loc) {
    const lines = code.split("\n");
    const errLine = e.loc.line - 1;
    console.log("Line " + e.loc.line + ", Col " + e.loc.column);
    if(errLine > 0) console.log("Prev:  " + lines[errLine-1]);
    console.log("Error: " + lines[errLine]);
    if(errLine < lines.length-1) console.log("Next:  " + lines[errLine+1]);
  }
}
