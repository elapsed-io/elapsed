/*
 * Entry point: the stylesheets in cascade-layer order, then the app. The page
 * paints its idle screen from static HTML before this runs.
 */
import './styles/layers.css';
import 'virtual:tokens.css';
import './styles/fonts.css';
import './styles/main.css';
import { startApp } from './app.ts';

startApp(document, window).catch((error: unknown) => {
  reportError(error);
});
