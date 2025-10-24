/**
 * Request Logging Middleware
 * 
 * Comprehensive logging middleware that tracks request lifecycle,
 * authentication context, authorization decisions, and performance metrics.
 * Provides audit trail for security and debugging purposes.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  path: string;
  userAgent?: string;
  clientIp?: string;
  timestamp: Date;
  duration?: number;
  statusCode?: number;
  userId?: string;
  authType?: 'jwt' | 'api_key' | 'none';
  authContext?: any;
  responseSize?: number;
  error?: string;
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLog');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request for tracking
    (req as any).requestId = requestId;

    const requestLog: RequestLog = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      userAgent: req.get('User-Agent'),
      clientIp: this.getClientIp(req),
      timestamp: new Date(),
    };

    // Log request start
    this.logger.log(`📥 ${req.method} ${req.url} [${requestId}] - Request started`);

    // Capture response details
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (data: any) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Log response when finished
    res.on('finish', () => {
      const endTime = Date.now();
      requestLog.duration = endTime - startTime;
      requestLog.statusCode = res.statusCode;
      requestLog.responseSize = res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0;

      // Add authentication context if available
      if ((req as any).user) {
        const user = (req as any).user;
        requestLog.userId = user.id || user.sub || user.email;
        requestLog.authType = user.isApiKeyAuth ? 'api_key' : 'jwt';
      }

      // Add authorization context if available
      if ((req as any).authContext) {
        requestLog.authContext = (req as any).authContext;
      }

      // Determine log level based on status code
      const logLevel = this.getLogLevel(res.statusCode);
      const statusIcon = this.getStatusIcon(res.statusCode);
      
      const logMessage = `${statusIcon} ${req.method} ${req.url} [${requestId}] - ${res.statusCode} (${requestLog.duration}ms)`;

      if (logLevel === 'error') {
        requestLog.error = `HTTP ${res.statusCode}`;
        this.logger.error(logMessage, this.formatLogDetails(requestLog));
      } else if (logLevel === 'warn') {
        this.logger.warn(logMessage, this.formatLogDetails(requestLog));
      } else {
        this.logger.log(logMessage);
      }

      // Log detailed information for debugging in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Request Details:', JSON.stringify(requestLog, null, 2));
      }
    });

    // Handle uncaught errors
    res.on('error', (error: Error) => {
      requestLog.error = error.message;
      this.logger.error(`❌ ${req.method} ${req.url} [${requestId}] - Error: ${error.message}`, error.stack);
    });

    next();
  }

  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
  }

  private getStatusIcon(statusCode: number): string {
    if (statusCode >= 500) return '💥';
    if (statusCode >= 400) return '⚠️';
    if (statusCode >= 300) return '🔄';
    return '✅';
  }

  private formatLogDetails(log: RequestLog): string {
    const details = [];
    
    if (log.userId) details.push(`User: ${log.userId}`);
    if (log.authType) details.push(`Auth: ${log.authType}`);
    if (log.clientIp && log.clientIp !== 'unknown') details.push(`IP: ${log.clientIp}`);
    if (log.responseSize) details.push(`Size: ${log.responseSize}b`);
    if (log.authContext?.action) details.push(`Action: ${log.authContext.action}`);

    return details.length > 0 ? `(${details.join(', ')})` : '';
  }
}