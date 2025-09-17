import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class HttpService {
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    const timeout = this.configService.get<number>('REQUEST_TIMEOUT_MS', 20000);
    const userAgent = this.configService.get<string>(
      'DEFAULT_USER_AGENT',
      'NovaStream/1.0',
    );

    this.axiosInstance = axios.create({
      timeout,
      headers: {
        'User-Agent': userAgent,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Tolerate self-signed certificates
      }),
      maxRedirects: 5,
    });
  }

  getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
