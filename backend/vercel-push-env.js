const fs = require("fs");
const { execSync } = require("child_process");

function pushEnv() {
    console.log("Reading .env file...");
    const envFile = fs.readFileSync(".env", "utf8");
    const lines = envFile.split("\n");

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;

        const splitIndex = line.indexOf("=");
        if (splitIndex === -1) continue;

        const key = line.substring(0, splitIndex).trim();
        let value = line.substring(splitIndex + 1).trim();

        if (/^['"].*['"]$/.test(value)) {
            value = value.substring(1, value.length - 1);
        }

        console.log(`\nProcessing: ${key}`);

        // Only target production and development to avoid manual prompts for branches
        for (const envMode of ['production', 'development']) {
            try {
                execSync(`npx vercel env rm ${key} ${envMode} -y`, { stdio: "ignore" });
            } catch (e) {
                // Ignore if it doesn't exist
            }
        }

        try {
            fs.writeFileSync("temp_val.txt", value);
            console.log(`Adding to production...`);
            execSync(`npx vercel env add ${key} production < temp_val.txt`, { stdio: "inherit" });
            console.log(`Adding to development...`);
            execSync(`npx vercel env add ${key} development < temp_val.txt`, { stdio: "inherit" });
            console.log(`Added ${key} successfully.`);
        } catch (e) {
            console.error(`Failed to add ${key}: ${e.message}`);
        }
    }

    if (fs.existsSync("temp_val.txt")) fs.unlinkSync("temp_val.txt");
    console.log("\nFinished pushing environment variables.");
}

pushEnv();
