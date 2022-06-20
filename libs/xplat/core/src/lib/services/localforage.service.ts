import { Injectable } from '@angular/core';
import * as localforage from 'localforage';

@Injectable({
	providedIn: 'root',
})
export class LocalforageService {
	constructor() {
		localforage.config({
			name: 'VGM',
		});
	}

	async get(key: string) {
		const data = await localforage.getItem(key);
		if (!data) return data;

		const { expire, value } = data as any;

		if (expire === false) {
			return value;
		}


		if (expire < Date.now()) {
			localforage.removeItem(key);
			return null;
		}

		return value;
	}

	set(
		key: string,
		value: any,
		expire: number | boolean = false,
		callback?: (...args: any[]) => void
	) {
		const callbackFunc = expire ? callback : (...args: any[]) => null;
		if (expire && typeof expire === 'number')
			expire = Math.round(expire * 1000 + Date.now()); // * 1000 to use seconds

		return localforage.setItem(key, { value, expire }, callbackFunc);
	}

	remove(key: string) {
		return localforage.removeItem(key);
	}

	DELETE_ALL() {
		return localforage.clear();
	}

	listKeys() {
		return localforage.keys();
	}

	clearKeys() {
		return localforage.clear();
	}
}
