import { join } from 'node:path';
import { GlobalFonts } from '@napi-rs/canvas';

export function registerFonts() {
  GlobalFonts.registerFromPath(
    join(import.meta.dirname, '..', '..', 'assets', 'fonts', 'Geist[wght].ttf'),
    'Geist'
  );

  GlobalFonts.registerFromPath(
    join(import.meta.dirname, '..', '..', 'assets', 'fonts', 'GeistMono[wght].ttf'),
    'GeistMono'
  );
}
