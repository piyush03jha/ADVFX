const fs = require("node:fs");
const validator = require("gltf-validator");

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-glb.cjs <file.glb>");
  process.exit(2);
}

const data = fs.readFileSync(file);

validator.validateBytes(new Uint8Array(data), {
  uri: file,
  format: "glb",
  maxIssues: 100,
  writeTimestamp: false,
}).then((report) => {
  const errors = (report.issues || []).filter((issue) => issue.severity === 0);
  if (errors.length) {
    console.error(JSON.stringify({ errors }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    errors: 0,
    warnings: (report.issues || []).filter((issue) => issue.severity === 1).length,
    infos: (report.issues || []).filter((issue) => issue.severity === 2).length,
  }));
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
