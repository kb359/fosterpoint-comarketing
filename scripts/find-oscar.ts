import * as dotenv from "dotenv";
dotenv.config();
import { findLinkedInUrl } from "../src/lib/ai/search";

async function main() {
  console.log("Searching for Oscar (Bardo co-founder)...");
  const url = await findLinkedInUrl("Oscar", "Bardo");
  console.log("Result:", url);

  console.log("\nSearching for Ingemar (Bardo co-founder)...");
  const url2 = await findLinkedInUrl("Ingemar", "Bardo");
  console.log("Result:", url2);
}
main().catch(console.error);
