import * as dotenv from "dotenv";
dotenv.config();
import { scrapeLinkedInPosts } from "../src/lib/phantombuster";

async function main() {
  console.log("Scraping Lior Kedmi (LeasePilot)...");
  const posts = await scrapeLinkedInPosts("https://linkedin.com/in/lior-kedmi");
  console.log("Posts scraped:", posts.length);
  if (posts[0]) console.log("First post preview:", posts[0].text.slice(0, 200));
  if (posts[1]) console.log("Second post preview:", posts[1].text.slice(0, 200));
}

main().catch(console.error);
