/*
 * Entry point. Round 1 renders a static idle screen from index.html; this
 * module only brings in the stylesheets in cascade-layer order. The timer
 * engine arrives in round 2 and the display modes in round 3.
 */
import './styles/layers.css';
import 'virtual:tokens.css';
import './styles/fonts.css';
import './styles/main.css';
