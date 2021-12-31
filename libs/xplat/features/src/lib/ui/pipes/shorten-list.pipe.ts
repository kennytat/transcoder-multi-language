import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortenList',
  pure: true,
})
export class ShortenListPipe implements PipeTransform {
  transform(value: string[]): string {
    if (value.length > 1) {
      return `${value[0]} and ${value.length - 1} more files`;
    } else {
      return value[0];
    }
  }
}
