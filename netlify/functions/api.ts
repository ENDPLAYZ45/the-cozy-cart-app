import serverless from "serverless-http";
import { app } from "../../server/_core/index";

export const handler = serverless(app);
