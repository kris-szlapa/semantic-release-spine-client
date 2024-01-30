import {Logger} from "@aws-lambda-powertools/logger"
import {serviceHealthCheck} from "./status"
import {SpineClient, SpineStatus} from "./spine-client"
import {Agent} from "https"
import axios, {Axios, AxiosRequestConfig} from "axios"

export class LiveSpineClient implements SpineClient {
  private readonly SPINE_URL_SCHEME = "https"
  private readonly SPINE_ENDPOINT = process.env.TargetSpineServer
  private readonly spineASID: string | undefined
  private readonly httpsAgent: Agent
  private readonly spinePartyKey: string | undefined
  private readonly axiosInstance: Axios
  private readonly logger: Logger

  constructor(logger: Logger) {
    this.spineASID = process.env.SpineASID
    this.spinePartyKey = process.env.SpinePartyKey

    this.httpsAgent = new Agent({
      cert: process.env.SpinePublicCertificate,
      key: process.env.SpinePrivateKey,
      ca: process.env.SpineCAChain
    })
    this.logger = logger
    this.axiosInstance = axios.create()
    this.axiosInstance.interceptors.request.use((config) => {
      config.headers["request-startTime"] = new Date().getTime()
      return config
    })

    this.axiosInstance.interceptors.response.use((response) => {
      const currentTime = new Date().getTime()
      const startTime = response.config.headers["request-startTime"]
      this.logger.info("spine request duration", {spine_duration: currentTime - startTime})

      return response
    }, (error) => {
      const currentTime = new Date().getTime()
      const startTime = error.config?.headers["request-startTime"]
      this.logger.info("spine request duration", {spine_duration: currentTime - startTime})

      return Promise.reject(error)
    })

  }

  private getSpineEndpoint(requestPath?: string) {
    return `${this.SPINE_URL_SCHEME}://${this.SPINE_ENDPOINT}/${requestPath}`
  }

  async getStatus(): Promise<SpineStatus> {
    if (!this.isCertificateConfigured()) {
      return {status: "pass", message: "Spine certificate is not configured"}
    }

    const axiosConfig: AxiosRequestConfig = {timeout: 20000}
    let endpoint: string

    if (process.env.healthCheckUrl === undefined) {
      axiosConfig.httpsAgent = this.httpsAgent
      endpoint = this.getSpineEndpoint("healthcheck")
    } else {
      axiosConfig.httpsAgent = new Agent()
      endpoint = process.env.healthCheckUrl
    }

    const spineStatus = await serviceHealthCheck(endpoint, this.logger, axiosConfig, this.axiosInstance)
    return {status: spineStatus.status, spineStatus: spineStatus}
  }

  isCertificateConfigured(): boolean {
    // Check if the required certificate-related environment variables are defined
    return (
      process.env.SpinePublicCertificate !== "ChangeMe" &&
      process.env.SpinePrivateKey !== "ChangeMe" &&
      process.env.SpineCAChain !== "ChangeMe"
    )
  }
}
