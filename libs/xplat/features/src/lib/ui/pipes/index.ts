import { DateOrderPipe } from './date-order.pipe';
import { ShortenListPipe } from './shorten-list.pipe';
import { ReplaceDotSlashPipe } from './replace-dot-slash.pipe';

export const UI_PIPES = [DateOrderPipe, ShortenListPipe, ReplaceDotSlashPipe];

export * from './date-order.pipe';
export * from './shorten-list.pipe';
export * from './replace-dot-slash.pipe';
