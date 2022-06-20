import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'replaceDotSlash',
	pure: true,
})
export class ReplaceDotSlashPipe implements PipeTransform {
	transform(value: string): any {
		if (value) return value.replace(/\./g, '/');
	}
}
