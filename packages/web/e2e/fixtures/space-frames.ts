/**
 * The interstellar frames (canvas version 1794927010-cb9d): "interstellar, running", "interstellar, paused" and
 * "results: interstellar", each the frame's own markup and its own arithmetic (its renderVals), at a given focused
 * time. The paused frame's comets are random; the tests draw it without them unless asked (`comets`). The results
 * frame is drawn as its replay lands, with the session's own numbers in place of the frame's sample ones.
 *
 * Generated from the canvas files; regenerate rather than edit by hand.
 */

import { frameDocument } from './frames.ts';

const TIMER_STARS = [
  '<circle cx="171.3" cy="244.9" r="0.6" fill="#DCE4FF" opacity="0.42"></circle>',
  '<circle cx="341.3" cy="261.4" r="0.8" fill="#DCE4FF" opacity="0.15"></circle>',
  '<circle cx="603.0" cy="116.7" r="0.5" fill="#DCE4FF" opacity="0.21"></circle>',
  '<circle cx="516.3" cy="243.4" r="0.8" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="460.1" cy="67.8" r="0.8" fill="#DCE4FF" opacity="0.20"></circle>',
  '<circle cx="666.6" cy="175.5" r="0.5" fill="#DCE4FF" opacity="0.35"></circle>',
  '<circle cx="46.1" cy="341.2" r="0.8" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="561.7" cy="370.6" r="0.6" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="517.6" cy="395.5" r="0.8" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="307.4" cy="327.7" r="0.8" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="673.6" cy="395.5" r="0.5" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="356.3" cy="116.1" r="0.8" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="451.2" cy="135.5" r="0.8" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="413.3" cy="240.3" r="0.6" fill="#DCE4FF" opacity="0.33"></circle>',
  '<circle cx="651.0" cy="306.9" r="0.5" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="713.5" cy="302.1" r="0.5" fill="#DCE4FF" opacity="0.36"></circle>',
  '<circle cx="235.0" cy="243.8" r="0.8" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="513.9" cy="95.0" r="0.8" fill="#DCE4FF" opacity="0.23"></circle>',
  '<circle cx="89.6" cy="216.9" r="0.8" fill="#DCE4FF" opacity="0.45"></circle>',
  '<circle cx="63.7" cy="360.3" r="0.6" fill="#DCE4FF" opacity="0.42"></circle>',
  '<circle cx="14.5" cy="192.2" r="0.6" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="31.8" cy="276.5" r="0.5" fill="#DCE4FF" opacity="0.26"></circle>',
  '<circle cx="422.2" cy="247.9" r="0.6" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="718.9" cy="139.4" r="0.5" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="385.6" cy="427.0" r="0.6" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="189.6" cy="310.4" r="0.6" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="690.2" cy="403.5" r="0.6" fill="#DCE4FF" opacity="0.26"></circle>',
  '<circle cx="626.3" cy="173.8" r="0.8" fill="#DCE4FF" opacity="0.35"></circle>',
  '<circle cx="73.9" cy="437.8" r="0.8" fill="#DCE4FF" opacity="0.23"></circle>',
  '<circle cx="456.7" cy="322.0" r="0.6" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="185.9" cy="136.3" r="0.6" fill="#DCE4FF" opacity="0.15"></circle>',
  '<circle cx="299.0" cy="261.0" r="0.5" fill="#DCE4FF" opacity="0.26"></circle>',
  '<circle cx="424.2" cy="60.0" r="0.8" fill="#DCE4FF" opacity="0.34"></circle>',
  '<circle cx="335.7" cy="305.7" r="0.6" fill="#DCE4FF" opacity="0.33"></circle>',
  '<circle cx="200.8" cy="220.3" r="0.8" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="486.7" cy="433.5" r="0.6" fill="#DCE4FF" opacity="0.34"></circle>',
  '<circle cx="215.0" cy="270.7" r="0.5" fill="#DCE4FF" opacity="0.26"></circle>',
  '<circle cx="225.1" cy="166.1" r="0.8" fill="#DCE4FF" opacity="0.23"></circle>',
  '<circle cx="566.9" cy="47.2" r="0.5" fill="#DCE4FF" opacity="0.44"></circle>',
  '<circle cx="492.3" cy="59.1" r="0.8" fill="#DCE4FF" opacity="0.22"></circle>',
  '<circle cx="578.7" cy="107.4" r="0.5" fill="#DCE4FF" opacity="0.35"></circle>',
  '<circle cx="467.7" cy="43.7" r="0.8" fill="#DCE4FF" opacity="0.25"></circle>',
  '<circle cx="240.3" cy="375.1" r="0.6" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="691.7" cy="36.0" r="0.8" fill="#DCE4FF" opacity="0.35"></circle>',
  '<circle cx="637.1" cy="203.0" r="0.5" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="24.4" cy="430.9" r="0.6" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="603.7" cy="82.6" r="0.6" fill="#DCE4FF" opacity="0.25"></circle>',
  '<circle cx="596.1" cy="38.5" r="0.8" fill="#DCE4FF" opacity="0.25"></circle>',
  '<circle cx="93.4" cy="131.4" r="0.6" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="456.6" cy="130.7" r="0.8" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="662.8" cy="70.2" r="0.5" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="599.4" cy="280.2" r="0.8" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="684.1" cy="417.3" r="0.5" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="328.8" cy="339.0" r="0.8" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="208.1" cy="153.5" r="0.5" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="617.7" cy="436.9" r="0.5" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="32.5" cy="406.6" r="0.8" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="142.9" cy="397.6" r="0.6" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="9.5" cy="335.4" r="0.5" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="172.1" cy="8.9" r="0.8" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="310.0" cy="213.7" r="7.5" fill="#FFD2A6" opacity="0.08"></circle>',
  '<circle cx="310.0" cy="213.7" r="2.49" fill="#FFD2A6" opacity="0.95"></circle>',
  '<circle cx="390.8" cy="338.6" r="7.9" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="390.8" cy="338.6" r="2.65" fill="#EAF0FF" opacity="0.99"></circle>',
  '<circle cx="369.7" cy="222.2" r="2.01" fill="#EAF0FF" opacity="0.84"></circle>',
  '<circle cx="324.7" cy="350.4" r="1.83" fill="#EAF0FF" opacity="0.79"></circle>',
  '<circle cx="338.6" cy="288.5" r="1.96" fill="#EAF0FF" opacity="0.82"></circle>',
  '<circle cx="347.6" cy="282.6" r="1.99" fill="#EAF0FF" opacity="0.83"></circle>',
  '<circle cx="356.1" cy="275.4" r="1.76" fill="#EAF0FF" opacity="0.78"></circle>',
  '<circle cx="349.7" cy="193.6" r="1.28" fill="#EAF0FF" opacity="0.66"></circle>',
  '<circle cx="564.0" cy="80.2" r="1.49" fill="#EAF0FF" opacity="0.71"></circle>',
  '<circle cx="560.6" cy="80.6" r="1.18" fill="#EAF0FF" opacity="0.64"></circle>',
  '<circle cx="569.1" cy="80.1" r="1.15" fill="#EAF0FF" opacity="0.63"></circle>',
  '<circle cx="567.2" cy="78.1" r="1.07" fill="#EAF0FF" opacity="0.61"></circle>',
  '<circle cx="566.2" cy="81.4" r="0.94" fill="#EAF0FF" opacity="0.58"></circle>',
  '<circle cx="568.5" cy="77.3" r="0.89" fill="#EAF0FF" opacity="0.57"></circle>',
  '<circle cx="560.5" cy="79.9" r="0.70" fill="#EAF0FF" opacity="0.49"></circle>',
  '<circle cx="569.2" cy="78.7" r="0.70" fill="#EAF0FF" opacity="0.45"></circle>',
  '<circle cx="467.5" cy="140.9" r="7.0" fill="#FFD2A6" opacity="0.08"></circle>',
  '<circle cx="467.5" cy="140.9" r="2.34" fill="#FFD2A6" opacity="0.91"></circle>',
  '<circle cx="367.4" cy="44.1" r="2.01" fill="#EAF0FF" opacity="0.83"></circle>',
  '<circle cx="482.0" cy="146.0" r="1.27" fill="#EAF0FF" opacity="0.66"></circle>',
  '<circle cx="499.6" cy="148.0" r="1.17" fill="#EAF0FF" opacity="0.64"></circle>',
  '<circle cx="493.4" cy="132.7" r="1.12" fill="#EAF0FF" opacity="0.62"></circle>',
  '<circle cx="482.1" cy="119.6" r="1.22" fill="#EAF0FF" opacity="0.65"></circle>',
  '<circle cx="344.8" cy="103.9" r="1.44" fill="#EAF0FF" opacity="0.70"></circle>',
  '<circle cx="210.6" cy="406.8" r="9.9" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="210.6" cy="406.8" r="3.31" fill="#EAF0FF" opacity="1.00"></circle>',
  '<circle cx="255.2" cy="416.7" r="1.87" fill="#EAF0FF" opacity="0.80"></circle>',
  '<circle cx="102.8" cy="231.2" r="7.7" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="102.8" cy="231.2" r="2.56" fill="#EAF0FF" opacity="0.97"></circle>',
  '<circle cx="127.0" cy="206.7" r="1.49" fill="#EAF0FF" opacity="0.71"></circle>',
  '<circle cx="112.1" cy="17.9" r="2.04" fill="#EAF0FF" opacity="0.84"></circle>',
  '<circle cx="90.9" cy="48.8" r="2.22" fill="#FFD2A6" opacity="0.89"></circle>',
  '<circle cx="225.3" cy="141.8" r="1.89" fill="#EAF0FF" opacity="0.81"></circle>',
  '<circle cx="354.5" cy="415.6" r="1.62" fill="#EAF0FF" opacity="0.74"></circle>',
  '<circle cx="404.0" cy="313.7" r="1.53" fill="#EAF0FF" opacity="0.72"></circle>',
].join('\n');

const RESULTS_STARS = [
  '<circle cx="163.2" cy="500.4" r="0.5" fill="#DCE4FF" opacity="0.21"></circle>',
  '<circle cx="31.5" cy="71.2" r="0.8" fill="#DCE4FF" opacity="0.21"></circle>',
  '<circle cx="462.1" cy="238.7" r="0.6" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="412.6" cy="466.6" r="0.6" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="168.6" cy="10.4" r="0.6" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="341.5" cy="473.8" r="0.8" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="186.0" cy="515.6" r="0.5" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="597.3" cy="56.0" r="0.5" fill="#DCE4FF" opacity="0.25"></circle>',
  '<circle cx="497.7" cy="258.7" r="0.8" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="149.7" cy="420.4" r="0.8" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="681.2" cy="254.1" r="0.5" fill="#DCE4FF" opacity="0.19"></circle>',
  '<circle cx="619.4" cy="237.3" r="0.8" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="205.7" cy="185.5" r="0.6" fill="#DCE4FF" opacity="0.19"></circle>',
  '<circle cx="550.3" cy="50.8" r="0.8" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="257.1" cy="334.8" r="0.6" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="142.3" cy="78.1" r="0.8" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="473.1" cy="420.2" r="0.8" fill="#DCE4FF" opacity="0.42"></circle>',
  '<circle cx="392.4" cy="179.0" r="0.5" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="158.2" cy="17.5" r="0.6" fill="#DCE4FF" opacity="0.26"></circle>',
  '<circle cx="600.7" cy="463.6" r="0.5" fill="#DCE4FF" opacity="0.35"></circle>',
  '<circle cx="83.7" cy="484.9" r="0.5" fill="#DCE4FF" opacity="0.21"></circle>',
  '<circle cx="551.9" cy="156.0" r="0.5" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="273.9" cy="434.9" r="0.8" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="166.8" cy="213.3" r="0.6" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="57.7" cy="36.4" r="0.8" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="61.4" cy="55.4" r="0.8" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="110.6" cy="487.0" r="0.6" fill="#DCE4FF" opacity="0.36"></circle>',
  '<circle cx="705.7" cy="32.7" r="0.5" fill="#DCE4FF" opacity="0.42"></circle>',
  '<circle cx="245.4" cy="342.3" r="0.5" fill="#DCE4FF" opacity="0.37"></circle>',
  '<circle cx="253.0" cy="501.8" r="0.5" fill="#DCE4FF" opacity="0.34"></circle>',
  '<circle cx="359.3" cy="31.5" r="0.8" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="694.9" cy="394.9" r="0.8" fill="#DCE4FF" opacity="0.20"></circle>',
  '<circle cx="243.0" cy="224.1" r="0.5" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="435.9" cy="258.5" r="0.6" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="274.4" cy="56.4" r="0.8" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="91.0" cy="228.5" r="0.8" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="668.5" cy="293.2" r="0.6" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="36.7" cy="25.4" r="0.5" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="522.1" cy="368.3" r="0.8" fill="#DCE4FF" opacity="0.42"></circle>',
  '<circle cx="471.8" cy="431.2" r="0.8" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="696.8" cy="392.9" r="0.8" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="409.7" cy="260.8" r="0.6" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="535.6" cy="336.6" r="0.5" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="213.5" cy="41.5" r="0.6" fill="#DCE4FF" opacity="0.43"></circle>',
  '<circle cx="706.8" cy="116.3" r="0.6" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="302.0" cy="387.0" r="0.8" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="371.7" cy="325.1" r="0.6" fill="#DCE4FF" opacity="0.38"></circle>',
  '<circle cx="213.0" cy="439.8" r="0.5" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="272.6" cy="304.2" r="0.6" fill="#DCE4FF" opacity="0.21"></circle>',
  '<circle cx="285.9" cy="199.4" r="0.8" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="497.3" cy="185.0" r="0.8" fill="#DCE4FF" opacity="0.33"></circle>',
  '<circle cx="260.8" cy="222.3" r="0.6" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="365.3" cy="42.6" r="0.5" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="527.9" cy="140.9" r="0.6" fill="#DCE4FF" opacity="0.38"></circle>',
  '<circle cx="449.7" cy="429.0" r="0.6" fill="#DCE4FF" opacity="0.23"></circle>',
  '<circle cx="594.2" cy="139.7" r="0.8" fill="#DCE4FF" opacity="0.27"></circle>',
  '<circle cx="260.2" cy="502.0" r="0.8" fill="#DCE4FF" opacity="0.37"></circle>',
  '<circle cx="179.9" cy="422.9" r="0.8" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="140.7" cy="258.3" r="0.5" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="279.3" cy="340.4" r="0.8" fill="#DCE4FF" opacity="0.45"></circle>',
  '<circle cx="662.7" cy="408.8" r="0.5" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="137.7" cy="137.6" r="0.5" fill="#DCE4FF" opacity="0.29"></circle>',
  '<circle cx="625.5" cy="470.8" r="0.8" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="437.1" cy="449.8" r="0.8" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="569.2" cy="434.5" r="0.5" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="470.6" cy="190.4" r="0.5" fill="#DCE4FF" opacity="0.39"></circle>',
  '<circle cx="521.8" cy="311.9" r="0.6" fill="#DCE4FF" opacity="0.22"></circle>',
  '<circle cx="535.7" cy="503.0" r="0.5" fill="#DCE4FF" opacity="0.31"></circle>',
  '<circle cx="82.1" cy="375.1" r="0.6" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="113.1" cy="464.6" r="0.5" fill="#DCE4FF" opacity="0.28"></circle>',
  '<circle cx="563.2" cy="51.9" r="0.5" fill="#DCE4FF" opacity="0.17"></circle>',
  '<circle cx="666.0" cy="175.2" r="0.5" fill="#DCE4FF" opacity="0.18"></circle>',
  '<circle cx="36.6" cy="289.0" r="0.8" fill="#DCE4FF" opacity="0.20"></circle>',
  '<circle cx="122.9" cy="332.6" r="0.6" fill="#DCE4FF" opacity="0.41"></circle>',
  '<circle cx="530.0" cy="249.0" r="0.8" fill="#DCE4FF" opacity="0.37"></circle>',
  '<circle cx="59.7" cy="71.5" r="0.8" fill="#DCE4FF" opacity="0.19"></circle>',
  '<circle cx="235.3" cy="212.1" r="0.5" fill="#DCE4FF" opacity="0.19"></circle>',
  '<circle cx="317.1" cy="361.3" r="0.6" fill="#DCE4FF" opacity="0.33"></circle>',
  '<circle cx="441.9" cy="215.7" r="0.6" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="645.5" cy="479.8" r="0.8" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="511.2" cy="451.6" r="0.8" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="380.2" cy="160.6" r="0.8" fill="#DCE4FF" opacity="0.43"></circle>',
  '<circle cx="599.8" cy="436.3" r="0.6" fill="#DCE4FF" opacity="0.30"></circle>',
  '<circle cx="699.5" cy="277.5" r="0.8" fill="#DCE4FF" opacity="0.24"></circle>',
  '<circle cx="156.6" cy="273.8" r="0.5" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="466.2" cy="64.6" r="0.6" fill="#DCE4FF" opacity="0.16"></circle>',
  '<circle cx="625.6" cy="263.4" r="0.6" fill="#DCE4FF" opacity="0.25"></circle>',
  '<circle cx="503.2" cy="323.1" r="0.5" fill="#DCE4FF" opacity="0.40"></circle>',
  '<circle cx="10.4" cy="430.4" r="0.6" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="91.7" cy="501.5" r="0.6" fill="#DCE4FF" opacity="0.32"></circle>',
  '<circle cx="310.0" cy="248.7" r="7.5" fill="#FFD2A6" opacity="0.08"></circle>',
  '<circle cx="310.0" cy="248.7" r="2.49" fill="#FFD2A6" opacity="0.95"></circle>',
  '<circle cx="390.8" cy="373.6" r="7.9" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="390.8" cy="373.6" r="2.65" fill="#EAF0FF" opacity="0.99"></circle>',
  '<circle cx="369.7" cy="257.2" r="2.01" fill="#EAF0FF" opacity="0.84"></circle>',
  '<circle cx="324.7" cy="385.4" r="1.83" fill="#EAF0FF" opacity="0.79"></circle>',
  '<circle cx="338.6" cy="323.5" r="1.96" fill="#EAF0FF" opacity="0.82"></circle>',
  '<circle cx="347.6" cy="317.6" r="1.99" fill="#EAF0FF" opacity="0.83"></circle>',
  '<circle cx="356.1" cy="310.4" r="1.76" fill="#EAF0FF" opacity="0.78"></circle>',
  '<circle cx="349.7" cy="228.6" r="1.28" fill="#EAF0FF" opacity="0.66"></circle>',
  '<circle cx="564.0" cy="115.2" r="1.49" fill="#EAF0FF" opacity="0.71"></circle>',
  '<circle cx="560.6" cy="115.6" r="1.18" fill="#EAF0FF" opacity="0.64"></circle>',
  '<circle cx="569.1" cy="115.1" r="1.15" fill="#EAF0FF" opacity="0.63"></circle>',
  '<circle cx="567.2" cy="113.1" r="1.07" fill="#EAF0FF" opacity="0.61"></circle>',
  '<circle cx="566.2" cy="116.4" r="0.94" fill="#EAF0FF" opacity="0.58"></circle>',
  '<circle cx="568.5" cy="112.3" r="0.89" fill="#EAF0FF" opacity="0.57"></circle>',
  '<circle cx="560.5" cy="114.9" r="0.70" fill="#EAF0FF" opacity="0.49"></circle>',
  '<circle cx="569.2" cy="113.7" r="0.70" fill="#EAF0FF" opacity="0.45"></circle>',
  '<circle cx="467.5" cy="175.9" r="7.0" fill="#FFD2A6" opacity="0.08"></circle>',
  '<circle cx="467.5" cy="175.9" r="2.34" fill="#FFD2A6" opacity="0.91"></circle>',
  '<circle cx="367.4" cy="79.1" r="2.01" fill="#EAF0FF" opacity="0.83"></circle>',
  '<circle cx="482.0" cy="181.0" r="1.27" fill="#EAF0FF" opacity="0.66"></circle>',
  '<circle cx="499.6" cy="183.0" r="1.17" fill="#EAF0FF" opacity="0.64"></circle>',
  '<circle cx="493.4" cy="167.7" r="1.12" fill="#EAF0FF" opacity="0.62"></circle>',
  '<circle cx="482.1" cy="154.6" r="1.22" fill="#EAF0FF" opacity="0.65"></circle>',
  '<circle cx="344.8" cy="138.9" r="1.44" fill="#EAF0FF" opacity="0.70"></circle>',
  '<circle cx="210.6" cy="441.8" r="9.9" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="210.6" cy="441.8" r="3.31" fill="#EAF0FF" opacity="1.00"></circle>',
  '<circle cx="255.2" cy="451.7" r="1.87" fill="#EAF0FF" opacity="0.80"></circle>',
  '<circle cx="102.8" cy="266.2" r="7.7" fill="#EAF0FF" opacity="0.08"></circle>',
  '<circle cx="102.8" cy="266.2" r="2.56" fill="#EAF0FF" opacity="0.97"></circle>',
  '<circle cx="127.0" cy="241.7" r="1.49" fill="#EAF0FF" opacity="0.71"></circle>',
  '<circle cx="112.1" cy="52.9" r="2.04" fill="#EAF0FF" opacity="0.84"></circle>',
  '<circle cx="90.9" cy="83.8" r="2.22" fill="#FFD2A6" opacity="0.89"></circle>',
  '<circle cx="225.3" cy="176.8" r="1.89" fill="#EAF0FF" opacity="0.81"></circle>',
  '<circle cx="354.5" cy="450.6" r="1.62" fill="#EAF0FF" opacity="0.74"></circle>',
  '<circle cx="404.0" cy="348.7" r="1.53" fill="#EAF0FF" opacity="0.72"></circle>',
].join('\n');

const PAUSED_COMETS = '<div aria-hidden="true" style="position: absolute; left: 120px; top: 70px; width: 0; height: 0; opacity: 0; --dx: 380px; --dy: 120px; animation: comet 20s linear 0.5s infinite"><div style="position: absolute; left: 0; top: -1.9px; width: 95px; height: 3.9px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-48deg); background: linear-gradient(90deg, rgba(210,240,255,0.85), rgba(210,240,255,0))"></div><div style="position: absolute; left: -3.2px; top: -3.2px; width: 6.5px; height: 6.5px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 6px 2px rgba(210,240,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 640px; top: 300px; width: 0; height: 0; opacity: 0; --dx: -300px; --dy: -170px; animation: comet 21s linear 5.5s infinite"><div style="position: absolute; left: 0; top: -2.3px; width: 94px; height: 4.7px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-23deg); background: linear-gradient(90deg, rgba(210,240,255,0.85), rgba(210,240,255,0))"></div><div style="position: absolute; left: -3.9px; top: -3.9px; width: 7.8px; height: 7.8px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 8px 3px rgba(210,240,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 300px; top: 30px; width: 0; height: 0; opacity: 0; --dx: 260px; --dy: 260px; animation: comet 19s linear 10.5s infinite"><div style="position: absolute; left: 0; top: -1.2px; width: 78px; height: 2.5px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-33deg); background: linear-gradient(90deg, rgba(190,226,255,0.85), rgba(190,226,255,0))"></div><div style="position: absolute; left: -2.1px; top: -2.1px; width: 4.1px; height: 4.1px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 4px 1px rgba(190,226,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 560px; top: 40px; width: 0; height: 0; opacity: 0; --dx: -340px; --dy: 150px; animation: comet 22s linear 15.5s infinite"><div style="position: absolute; left: 0; top: -2.0px; width: 104px; height: 4.0px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-41deg); background: linear-gradient(90deg, rgba(190,226,255,0.85), rgba(190,226,255,0))"></div><div style="position: absolute; left: -3.3px; top: -3.3px; width: 6.6px; height: 6.6px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 7px 2px rgba(190,226,255,0.6)"></div></div>\n';

const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const BODIES = [1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];
const RINGS = [0.39, 0.72, 1.0, 1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];

/** The frames' map at `focus` minutes: the Sun at `sun`, `usable` px of path, heading `cos`, `sin`. */
function mapValues(focus: number, sun: readonly [number, number], usable: number, cos: number, sin: number): Record<string, string> {
  const r = 1 + focus * 0.12024;
  const k = usable / Math.max(r, 1.6);
  const P = (au: number): [number, number] => [sun[0] + au * k * cos, sun[1] + au * k * sin];
  const out: Record<string, string> = {};
  RINGS.forEach((au, i) => {
    const rad = au * k;
    out[`r${String(i)}`] = rad.toFixed(1);
    out[`o${String(i)}`] = (0.55 * sm((rad - 3) / 6)).toFixed(2);
  });
  const [tx, ty] = P(r);
  const [ex, ey] = P(1);
  Object.assign(out, { tx: tx.toFixed(1), ty: ty.toFixed(1), ex: ex.toFixed(1), ey: ey.toFixed(1), eo: sm((k - 9) / 8).toFixed(2) });
  BODIES.forEach((au, j) => {
    const [x, y] = P(au);
    const rad = au * k;
    out[`cx${String(j)}`] = x.toFixed(1);
    out[`cy${String(j)}`] = y.toFixed(1);
    out[`lx${String(j)}`] = (x + 9).toFixed(1);
    out[`ly${String(j)}`] = (y + 19).toFixed(1);
    out[`co${String(j)}`] = r >= au ? sm((rad - 24) / 14).toFixed(2) : '0';
  });
  let lastX = 1e9;
  [...BODIES.keys()].reverse().forEach((j) => {
    const x = Number(out[`cx${String(j)}`]);
    const keep = Number(out[`co${String(j)}`]) > 0.3 && lastX - x > 70;
    out[`lo${String(j)}`] = keep ? '1' : '0';
    if (keep) lastX = x;
  });
  return out;
}

const TIMER = (focus: number): Record<string, string> => mapValues(focus, [70, 392], 606.5, 0.8829, -0.4695);

/** "interstellar, running" at `focus` minutes, the time `hhmm`. */
export function spaceFrame(focus: number, hhmm: string): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  const v: Record<string, string> = { ...TIMER(focus), hh, mm };
  const g = (key: string): string => v[key] ?? '';
  const c = { text: '#E8ECF6', end: '#A8403D', gray: '#23263A' };
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: #03040A; color: #E8ECF6; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0">
<g opacity="0.55">
${TIMER_STARS}</g>
<circle cx="70" cy="392" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="70" cy="392" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="70" cy="392" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="70" cy="392" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="70" cy="392" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="70" cy="392" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="70" cy="392" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="70" cy="392" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="70" cy="392" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="70" cy="392" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px">${g('hh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('mm')}</div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>
</div>`);
}

/** "interstellar, paused" at `focus` minutes: the time `hhmm` held, paused for `pausedFor`, the distance line. */
export function spacePausedFrame(focus: number, hhmm: string, pausedFor: string, line: string, comets = false): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  const [ph = '', pm = '', ps = ''] = pausedFor.split(':');
  const v: Record<string, string> = { ...TIMER(focus), hh, mm, ph, pm, ps, line };
  const g = (key: string): string => v[key] ?? '';
  const c = { text: '#E8ECF6', end: '#A8403D', accent: '#35764E', gray: '#23263A' };
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: #03040A; color: #E8ECF6; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0"><g opacity="0.55">
${TIMER_STARS}</g>
</svg>
<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 450px; filter: blur(10px); opacity: 0.4"><svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0">
<circle cx="70" cy="392" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="70" cy="392" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="70" cy="392" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="70" cy="392" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="70" cy="392" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="70" cy="392" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="70" cy="392" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="70" cy="392" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="70" cy="392" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="70" cy="392" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
</div>
${comets ? PAUSED_COMETS : ''}<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px; color: #E8ECF6; filter: blur(10px); opacity: 0.4">${g('hh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('mm')}</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px; color: #E8ECF6">${g('ph')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('pm')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('ps')}<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: #9AA6C8; letter-spacing: 0.14em; white-space: nowrap">paused for</div></div></div></div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.accent}">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; font-size: 11px; color: #B9C6DE">${g('line')}</div>
</div>`);
}

/** The session's numbers on the results card: the focused time, and the six stats. */
export interface SpaceResults {
  readonly focused: string;
  readonly stats: readonly [string, string, string, string, string, string];
}

/** "results: interstellar" as the replay lands, after `focus` minutes of focus. */
export function resultsSpaceFrame(focus: number, results: SpaceResults): string {
  const r = 1 + focus * 0.12024;
  const passed = (
    [
      [1.52, 'mars'],
      [5.2, 'jupiter'],
      [9.54, 'saturn'],
      [19.2, 'uranus'],
      [30.1, 'neptune'],
      [39.5, 'pluto'],
      [50, 'kuiper belt edge'],
      [94, 'termination shock'],
      [120, 'heliopause'],
    ] as const
  )
    .filter(([au]) => r >= au)
    .map(([, name]) => name);
  const dist = `${(r - 1).toFixed(1)} au travelled${passed.length > 0 ? ` · past ${passed[passed.length - 1] ?? ''}` : ' · leaving earth'}`;
  const [fh = '', fm = '', fs = ''] = results.focused.split(':');
  const [s0, s1, s2, s3, s4, s5] = results.stats;
  const v: Record<string, string> = { ...mapValues(focus, [34, 178], 476.8, 0.9563, -0.2924), dist, fh, fm, fs, s0, s1, s2, s3, s4, s5, ov: '0.000', co: '1.000', cy: '0.0' };
  const g = (key: string): string => v[key] ?? '';
  const c = { bg: '#03040A', text: '#E8ECF6', muted: '#9AA4C0', icon: '#9AA4C0' };
  return frameDocument(`<div style="width: 720px; height: 520px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden">
<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; opacity: 0.45"><svg width="720" height="520" viewBox="0 0 720 520"><g>
${RESULTS_STARS}</g>
</svg></div>
<div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; opacity: ${g('ov')}">
<div style="font-size: 13px; color: ${c.muted}; letter-spacing: 0.06em">tabulating results</div>
<div style="width: 380px; height: 3px; border-radius: 2px; background: ${c.text}"></div>
<div style="height: 52px"></div>
</div>
<div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; box-sizing: border-box; padding: 24px 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; opacity: ${g('co')}; transform: translateY(${g('cy')}px)">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">
<div style="font-size: 11px; color: ${c.muted}; letter-spacing: 0.16em">focused</div>
<div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 60px">${g('fh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('fm')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('fs')}</div>
</div>
<div style="position: relative; width: 600px; height: 208px; overflow: hidden">
<svg width="600" height="208" viewBox="0 0 600 208" role="img" aria-label="journey outward from the sun at light speed" style="position: absolute; top: 0; left: 0">
<circle cx="34" cy="178" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="34" cy="178" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="34" cy="178" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="34" cy="178" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="34" cy="178" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="34" cy="178" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="34" cy="178" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="34" cy="178" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="34" cy="178" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="34" cy="178" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="34" cy="178" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="34" cy="178" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="34" cy="178" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="34" cy="178" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
<div style="position: absolute; left: 12px; top: 10px; font-size: 11px; color: #E8ECF6; font-variant-numeric: tabular-nums">${g('dist')}</div>
</div>
<div style="width: 100%; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">elapsed</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s0')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">paused</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s1')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">pauses</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s2')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">longest stretch</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s3')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">started</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s4')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">ended</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s5')}</div></div>
</div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">
<div style="display: flex; gap: 14px"><button aria-label="retry" style="width: 32px; height: 32px; padding: 0; background: transparent; border: 0; color: ${c.text}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path></svg></button><button aria-label="share" style="width: 32px; height: 32px; padding: 0; background: transparent; border: 0; color: ${c.text}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path><path d="M7 9l5 -5l5 5"></path><path d="M12 4l0 12"></path></svg></button></div>
</div>
</div>
</div>`);
}
