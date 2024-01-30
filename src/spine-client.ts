import {Logger} from "@aws-lambda-powertools/logger"
import {LiveSpineClient} from "./live-spine-client"
import {SandboxSpineClient} from "./sandbox-spine-client"
import {StatusCheckResponse} from "./status"

export interface SpineStatus {
  status: string
  message?: string
  spineStatus?: StatusCheckResponse
}

export interface SpineClient {
  getStatus(): Promise<SpineStatus>
  isCertificateConfigured(): boolean
}

export function createSpineClient(logger: Logger): SpineClient {
  const liveMode = process.env.TargetSpineServer !== "sandbox"
  if (liveMode) {
    return new LiveSpineClient(logger)
  } else {
    return new SandboxSpineClient()
  }
}
