import { execSync } from "child_process";
console.log("CWD:", process.cwd());
const result = execSync("find / -name i18n-labels.json -type f 2>/dev/null || true").toString();
console.log("Found:", result);
