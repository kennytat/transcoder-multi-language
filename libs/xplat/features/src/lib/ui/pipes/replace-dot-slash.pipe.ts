import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceDotSlash',
  pure: true,
})
export class ReplaceDotSlashPipe implements PipeTransform {
  transform(value: string): any {
    if (value) {
      console.log('value from pipe', value);

      return value.replace(/\./, '/')
    }
  }
}
