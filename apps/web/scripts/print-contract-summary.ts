import { getFrontendContractSummary } from "../lib/forms/contract-summary";

process.stdout.write(`${JSON.stringify(getFrontendContractSummary())}\n`);
