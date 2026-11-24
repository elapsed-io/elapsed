"""Mode recipe format v1: a schema, the eight built-in modes as recipes, validation and a coverage check."""
import json, os, copy
from jsonschema import Draft202012Validator

# ---------------- shared definitions ----------------
D = {}
D['color'] = {'anyOf': [{'type': 'string', 'pattern': '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'},
                        {'enum': ['theme.bg', 'theme.text', 'theme.accent', 'theme.muted', 'theme.faint', 'theme.track', 'theme.gray',
                                  'theme.end', 'theme.pr', 'contrast.text', 'contrast.muted']}]}
D['id'] = {'type': 'string', 'pattern': '^[a-z][a-z0-9-]{0,31}$'}
D['slotId'] = {'type': 'string', 'pattern': '^[a-z][a-z0-9-]{0,31}(\\.[a-z0-9-]{1,32}){0,2}$'}
D['source'] = {'type': 'string', 'pattern': '^(measure|progress|elapsed|cycle:[a-z][a-z0-9-]{0,31})$'}
D['states'] = {'type': 'array', 'items': {'enum': ['idle', 'running', 'paused', 'checkin', 'results']}, 'minItems': 1, 'uniqueItems': True}
D['range'] = {'type': 'array', 'items': {'type': 'number'}, 'minItems': 2, 'maxItems': 2}
D['frac'] = {'type': 'number', 'minimum': 0, 'maximum': 1}
D['point'] = {'type': 'array', 'items': {'$ref': '#/$defs/frac'}, 'minItems': 2, 'maxItems': 2}
D['template'] = {'type': 'string', 'maxLength': 80, 'pattern': '^([^{}]|\\{(value|unit|zone|time|pause|landmark|distance)\\})*$'}
D['label'] = {'type': 'string', 'minLength': 1, 'maxLength': 48, 'pattern': '^[^<>{}]*$'}
# a binding: any number may follow the measure, a cycle or the replay's progress through piecewise stops (no formulas)
D['binding'] = {'oneOf': [{'type': 'number'},
                          {'type': 'object', 'additionalProperties': False, 'required': ['by', 'stops'],
                           'properties': {'by': {'$ref': '#/$defs/source'},
                                          'stops': {'type': 'array', 'minItems': 2, 'maxItems': 16, 'items': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 2, 'maxItems': 2}},
                                          'ease': {'enum': ['linear', 'smooth']}}}]}
D['variant'] = {'type': 'object', 'additionalProperties': False, 'required': ['option', 'value'],
                'properties': {'option': {'$ref': '#/$defs/id'}, 'value': {'type': ['string', 'boolean']}}}
D['hand'] = {'type': 'object', 'additionalProperties': False, 'properties': {
    'length': {'type': 'number', 'minimum': 4, 'maximum': 400}, 'width': {'type': 'number', 'minimum': 0.5, 'maximum': 12}, 'color': {'$ref': '#/$defs/color'}}}

def layer(t, props, required=()):
    base = {'type': {'const': t}, 'id': {'$ref': '#/$defs/id'}, 'when': {'$ref': '#/$defs/states'},
            'variantOf': {'$ref': '#/$defs/variant'}, 'space': {'enum': ['screen', 'camera', 'sky']},
            'blurOnPause': {'type': 'boolean'}, 'opacity': {'$ref': '#/$defs/binding'}}
    base.update(props)
    return {'type': 'object', 'additionalProperties': False, 'required': ['type', 'id'] + list(required), 'properties': base}

pos = {'oneOf': [{'enum': ['center', 'top', 'bottom']}, {'$ref': '#/$defs/point'}]}
LAYERS = [
    layer('time', {'size': {'type': 'number', 'minimum': 24, 'maximum': 200}, 'position': pos, 'seconds': {'enum': ['setting', 'never']}}),
    layer('text', {'template': {'$ref': '#/$defs/template'}, 'position': pos, 'size': {'type': 'number', 'minimum': 9, 'maximum': 48}, 'color': {'$ref': '#/$defs/color'}}, ['template']),
    layer('ring', {'radius': {'type': 'number', 'minimum': 20, 'maximum': 400}, 'thickness': {'type': 'number', 'minimum': 1, 'maximum': 40},
                   'cycle': {'$ref': '#/$defs/id'}, 'track': {'$ref': '#/$defs/color'}, 'fill': {'$ref': '#/$defs/color'},
                   'tail': {'type': 'object', 'additionalProperties': False, 'properties': {'degrees': {'type': 'number', 'minimum': 0, 'maximum': 360}, 'growIn': {'type': 'boolean'}, 'fade': {'enum': ['linear', 'ease']}}},
                   'head': {'type': 'object', 'additionalProperties': False, 'properties': {'size': {'type': 'number', 'minimum': 0, 'maximum': 40}}}}, ['cycle']),
    layer('dial', {'radius': {'type': 'number', 'minimum': 20, 'maximum': 400}, 'cycle': {'$ref': '#/$defs/id'},
                   'ticks': {'type': 'object', 'additionalProperties': False, 'properties': {'major': {'type': 'integer', 'minimum': 2, 'maximum': 120}, 'minor': {'type': 'integer', 'minimum': 0, 'maximum': 600}}},
                   'labels': {'type': 'object', 'additionalProperties': False, 'properties': {'count': {'type': 'integer', 'minimum': 0, 'maximum': 60}, 'format': {'enum': ['minutes', 'hours', 'none']}}},
                   'hand': {'$ref': '#/$defs/hand'},
                   'subdials': {'type': 'array', 'maxItems': 3, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['cycle'], 'properties': {
                       'cycle': {'$ref': '#/$defs/id'}, 'radius': {'type': 'number', 'minimum': 8, 'maximum': 200}, 'offset': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 2, 'maxItems': 2},
                       'labels': {'type': 'integer', 'minimum': 0, 'maximum': 24}, 'hand': {'$ref': '#/$defs/hand'}}}}}, ['cycle']),
    layer('track', {'width': {'type': 'number', 'minimum': 80, 'maximum': 1200}, 'pxPerMinute': {'type': 'number', 'minimum': 0.5, 'maximum': 60},
                    'ticks': {'type': 'object', 'additionalProperties': False, 'properties': {'every': {'type': 'number', 'minimum': 1}, 'labelEvery': {'type': 'number', 'minimum': 1}, 'format': {'enum': ['hh:mm', 'value']}}},
                    'fadeEnds': {'type': 'boolean'}, 'past': {'$ref': '#/$defs/color'}, 'future': {'$ref': '#/$defs/color'}, 'drawBeforeStart': {'type': 'boolean'},
                    'marker': {'type': 'object', 'additionalProperties': False, 'properties': {'source': {'enum': ['personal-record']}, 'label': {'$ref': '#/$defs/template'}, 'color': {'$ref': '#/$defs/color'}}}}),
    layer('sprite', {'slot': {'$ref': '#/$defs/slotId'}, 'frames': {'type': 'integer', 'minimum': 1, 'maximum': 48},
                     'frameBy': {'oneOf': [{'type': 'object', 'additionalProperties': False, 'required': ['cycle'], 'properties': {'cycle': {'$ref': '#/$defs/id'}}},
                                           {'type': 'object', 'additionalProperties': False, 'required': ['zone'], 'properties': {'zone': {'const': True}}},
                                           {'type': 'object', 'additionalProperties': False, 'required': ['by'], 'properties': {'by': {'$ref': '#/$defs/source'}, 'from': {'type': 'number'}, 'to': {'type': 'number'}}}]},
                     'crossfade': {'type': 'number', 'minimum': 0, 'maximum': 600}, 'position': pos, 'size': {'type': 'array', 'items': {'type': 'number', 'minimum': 8, 'maximum': 1600}, 'minItems': 2, 'maxItems': 2},
                     'scale': {'$ref': '#/$defs/binding'}}, ['slot', 'frames']),
    layer('tree', {'view': {'enum': ['side', 'isometric']}, 'year': {'$ref': '#/$defs/id'}, 'growth': {'$ref': '#/$defs/binding'},
                   'leaves': {'type': 'object', 'additionalProperties': False, 'properties': {
                       'clusters': {'type': 'integer', 'minimum': 10, 'maximum': 160}, 'offsetMax': {'type': 'number', 'minimum': 0, 'maximum': 0.5},
                       'spring': {'type': 'array', 'items': {'$ref': '#/$defs/color'}, 'maxItems': 3}, 'summer': {'type': 'array', 'items': {'$ref': '#/$defs/color'}, 'maxItems': 3},
                       'autumn': {'type': 'array', 'items': {'$ref': '#/$defs/color'}, 'maxItems': 3}, 'fallBy': {'enum': ['autumn-end', 'never']}}},
                   'snow': {'type': 'object', 'additionalProperties': False, 'properties': {'phase': {'$ref': '#/$defs/id'}, 'branches': {'type': 'boolean'}, 'ground': {'type': 'boolean'}}},
                   'trunk': {'$ref': '#/$defs/color'}, 'ground': {'enum': ['line', 'field', 'none']}, 'grass': {'$ref': '#/$defs/color'}}, ['view', 'year']),
    layer('passing', {'direction': {'enum': ['up', 'down', 'left', 'right']},
                      'items': {'type': 'array', 'maxItems': 24, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['slot', 'from', 'to'], 'properties': {
                          'slot': {'$ref': '#/$defs/slotId'}, 'from': {'type': 'number'}, 'to': {'type': 'number'}, 'x': {'$ref': '#/$defs/frac'},
                          'opacity': {'$ref': '#/$defs/frac'}, 'size': {'type': 'number', 'minimum': 8, 'maximum': 400}}}}}, ['direction', 'items']),
    layer('particles', {'shape': {'enum': ['streak', 'comet', 'dot', 'flake', 'image', 'beam']}, 'slot': {'$ref': '#/$defs/slotId'},
                        'catalogByZone': {'type': 'object', 'maxProperties': 12, 'additionalProperties': {'type': 'array', 'maxItems': 12, 'items': {'$ref': '#/$defs/slotId'}}},
                        'visibleWhen': {'type': 'object', 'additionalProperties': False, 'properties': {'by': {'$ref': '#/$defs/source'}, 'min': {'type': 'number'}, 'max': {'type': 'number'}, 'phase': {'$ref': '#/$defs/id'}}},
                        'every': {'$ref': '#/$defs/range'}, 'maxAtOnce': {'type': 'integer', 'minimum': 1, 'maximum': 12}, 'lifetime': {'$ref': '#/$defs/range'},
                        'size': {'type': 'object', 'additionalProperties': False, 'properties': {'length': {'$ref': '#/$defs/range'}, 'thickness': {'$ref': '#/$defs/range'}, 'head': {'$ref': '#/$defs/range'}, 'scale': {'$ref': '#/$defs/range'}}},
                        'colors': {'type': 'array', 'maxItems': 6, 'items': {'$ref': '#/$defs/color'}},
                        'angle': {'$ref': '#/$defs/range'}, 'distance': {'$ref': '#/$defs/range'},
                        'orient': {'enum': ['travel', 'away-from-anchor', 'none']}, 'depths': {'type': 'integer', 'minimum': 1, 'maximum': 3},
                        'arrive': {'enum': ['fade', 'drift-in']}, 'leaveOnResume': {'type': 'boolean'},
                        'bursts': {'type': 'object', 'additionalProperties': False, 'properties': {'every': {'$ref': '#/$defs/range'}, 'count': {'$ref': '#/$defs/range'}, 'within': {'type': 'number', 'minimum': 0.5, 'maximum': 10}}},
                        'origin': {'type': 'array', 'items': {'type': 'number', 'minimum': -3, 'maximum': 3}, 'minItems': 2, 'maxItems': 2},
                        'lanes': {'type': 'integer', 'minimum': 2, 'maximum': 24}, 'spread': {'type': 'array', 'items': {'type': 'number', 'minimum': -89, 'maximum': 89}, 'minItems': 2, 'maxItems': 2},
                        'widths': {'type': 'array', 'items': {'type': 'number', 'minimum': 0.1, 'maximum': 10}, 'minItems': 2, 'maxItems': 2}, 'noOverlap': {'type': 'boolean'},
                        'fade': {'type': 'object', 'additionalProperties': False, 'properties': {'in': {'$ref': '#/$defs/range'}, 'hold': {'$ref': '#/$defs/range'}, 'out': {'$ref': '#/$defs/range'}, 'rest': {'$ref': '#/$defs/range'}}},
                        'peak': {'type': 'number', 'minimum': 0, 'maximum': 0.25}, 'shimmer': {'type': 'number', 'minimum': 0, 'maximum': 0.5},
                        'field': {'type': 'object', 'additionalProperties': False, 'required': ['count'], 'properties': {
                            'count': {'type': 'integer', 'minimum': 1, 'maximum': 120},
                            'crossSeconds': {'type': 'array', 'items': {'type': 'number', 'minimum': 5, 'maximum': 600}, 'minItems': 1, 'maxItems': 3},
                            'swayPx': {'type': 'array', 'items': {'type': 'number', 'minimum': 0, 'maximum': 60}, 'minItems': 1, 'maxItems': 3},
                            'swaySeconds': {'type': 'array', 'items': {'type': 'number', 'minimum': 2, 'maximum': 600}, 'minItems': 1, 'maxItems': 3}}},
                        'falloff': {'type': 'array', 'minItems': 2, 'maxItems': 8, 'items': {'type': 'array', 'minItems': 2, 'maxItems': 2, 'items': {'type': 'number', 'minimum': 0, 'maximum': 1}}}},
          ['shape', 'every', 'maxAtOnce']),
    layer('starfield', {'slot': {'$ref': '#/$defs/slotId'}, 'magnitudeMax': {'type': 'number', 'minimum': 0, 'maximum': 6.5},
                        'projection': {'type': 'object', 'additionalProperties': False, 'properties': {'type': {'enum': ['gnomonic', 'equirectangular']}, 'ra': {'type': 'number', 'minimum': 0, 'maximum': 24},
                                       'dec': {'type': 'number', 'minimum': -90, 'maximum': 90}, 'pxPerDegree': {'type': 'number', 'minimum': 1, 'maximum': 40}}},
                        'radius': {'type': 'object', 'additionalProperties': False, 'properties': {'min': {'type': 'number'}, 'at0': {'type': 'number'}, 'perMagnitude': {'type': 'number'}}},
                        'pan': {'type': 'object', 'additionalProperties': False, 'properties': {'when': {'$ref': '#/$defs/states'}, 'turnMinutes': {'type': 'number', 'minimum': 1, 'maximum': 120}}}}, ['slot']),
    layer('circles', {'color': {'$ref': '#/$defs/color'}, 'fadeBelowPx': {'type': 'number', 'minimum': 0, 'maximum': 40},
                      'items': {'type': 'array', 'maxItems': 24, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['at'], 'properties': {
                          'at': {'type': 'number', 'minimum': 0}, 'label': {'$ref': '#/$defs/label'}, 'dashed': {'type': 'boolean'}}}}}, ['items']),
    layer('path', {'from': {'type': 'number'}, 'color': {'$ref': '#/$defs/color'}, 'width': {'type': 'number', 'minimum': 0.5, 'maximum': 8},
                   'head': {'type': 'object', 'additionalProperties': False, 'properties': {'size': {'type': 'number', 'minimum': 0, 'maximum': 20}, 'color': {'$ref': '#/$defs/color'}}}}),
    layer('landmarks', {'slot': {'$ref': '#/$defs/slotId'}, 'anchor': {'enum': ['path', 'chart']},
                        'perBand': {'type': 'object', 'additionalProperties': False, 'properties': {'size': {'type': 'number', 'minimum': 0}, 'max': {'type': 'integer', 'minimum': 1, 'maximum': 4}}},
                        'maxTotal': {'type': 'integer', 'minimum': 1, 'maximum': 12}, 'dot': {'$ref': '#/$defs/color'}, 'fadeBelowPx': {'type': 'number', 'minimum': 0, 'maximum': 40},
                        'labels': {'type': 'object', 'additionalProperties': False, 'properties': {'pop': {'type': 'boolean'}, 'fadeAfterReplay': {'type': 'boolean'}, 'hover': {'type': 'boolean'}, 'template': {'$ref': '#/$defs/template'}}}}, ['slot']),
    layer('shape', {'shape': {'enum': ['circle', 'rect', 'ellipse']}, 'size': {'type': 'array', 'items': {'type': 'number', 'minimum': 1, 'maximum': 4000}, 'minItems': 2, 'maxItems': 2},
                    'x': {'$ref': '#/$defs/binding'}, 'y': {'$ref': '#/$defs/binding'}, 'scale': {'$ref': '#/$defs/binding'},
                    'fill': {'oneOf': [{'$ref': '#/$defs/color'}, {'type': 'object', 'additionalProperties': False, 'required': ['radial'], 'properties': {'radial': {'type': 'array', 'maxItems': 6, 'items': {'type': 'array', 'minItems': 2, 'maxItems': 2}}}},
                                       {'type': 'object', 'additionalProperties': False, 'required': ['linear'], 'properties': {'linear': {'type': 'array', 'minItems': 2, 'maxItems': 6, 'items': {'type': 'array', 'minItems': 2, 'maxItems': 2}}}}]},
                    'glow': {'type': 'object', 'additionalProperties': False, 'properties': {'blur': {'type': 'number', 'minimum': 0, 'maximum': 80}, 'color': {'$ref': '#/$defs/color'}}}}, ['shape', 'size']),
    layer('reveal', {'slot': {'$ref': '#/$defs/slotId'}, 'direction': {'enum': ['up', 'down', 'left', 'right', 'radial']}, 'by': {'$ref': '#/$defs/binding'}}, ['slot', 'direction', 'by']),

    layer('scenery', {'preset': {'enum': ['conifers', 'hills', 'image']}, 'slot': {'$ref': '#/$defs/slotId'},
                      'baseY': {'type': 'number', 'minimum': 0, 'maximum': 1.5}, 'height': {'type': 'array', 'items': {'type': 'number', 'minimum': 8, 'maximum': 300}, 'minItems': 2, 'maxItems': 2}, 'color': {'$ref': '#/$defs/color'},
                      'distance': {'type': 'number', 'minimum': 1, 'maximum': 100}, 'tileX': {'type': 'boolean'}, 'seed': {'type': 'integer', 'minimum': 0, 'maximum': 9999}},
          ['preset', 'distance']),
    layer('subject', {
        'art': {'type': 'object', 'additionalProperties': False, 'required': ['preset'], 'properties': {'preset': {'enum': ['falcon', 'image']}, 'slot': {'$ref': '#/$defs/slotId'}, 'color': {'$ref': '#/$defs/color'}}},
        'size': {'type': 'number', 'minimum': 4, 'maximum': 200}, 'position': {'$ref': '#/$defs/point'},
        'entry': {'type': 'object', 'additionalProperties': False, 'properties': {'from': {'type': 'array', 'items': {'type': 'number', 'minimum': -1, 'maximum': 2}, 'minItems': 2, 'maxItems': 2},
                  'delay': {'type': 'number', 'minimum': 0, 'maximum': 10}, 'speed': {'type': 'number', 'minimum': 0, 'maximum': 2000}}},
        'motion': {'type': 'object', 'additionalProperties': False, 'properties': {'forwardSpeed': {'type': 'number', 'minimum': 0, 'maximum': 2000}, 'forwardDecay': {'type': 'number', 'minimum': 0.1, 'maximum': 60},
                   'climbFrom': {'enum': ['measure', 'none']}, 'climbRamp': {'type': 'number', 'minimum': 0, 'maximum': 30}}},
        'flight': {'type': 'object', 'additionalProperties': False, 'properties': {
            'flapHz': {'type': 'number', 'minimum': 0.5, 'maximum': 12}, 'downstrokeShare': {'type': 'number', 'minimum': 0.3, 'maximum': 0.7}, 'upstrokeFold': {'type': 'number', 'minimum': 0, 'maximum': 0.6},
            'pattern': {'type': 'array', 'maxItems': 6, 'items': {'type': 'object', 'additionalProperties': False, 'minProperties': 1, 'maxProperties': 1,
                        'properties': {'flap': {'type': 'number', 'minimum': 0, 'maximum': 600}, 'glide': {'type': 'number', 'minimum': 0, 'maximum': 600}}}},
            'glideAngle': {'type': 'number', 'minimum': -90, 'maximum': 0}, 'glideWobble': {'type': 'number', 'minimum': 0, 'maximum': 15}, 'steady': {'type': 'boolean'}}},
        'stages': {'type': 'array', 'maxItems': 6, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['from'], 'properties': {
            'from': {'type': 'number'}, 'label': {'$ref': '#/$defs/label'}, 'color': {'$ref': '#/$defs/color'}, 'crossfade': {'type': 'number', 'minimum': 0, 'maximum': 600},
            'halo': {'type': 'object', 'additionalProperties': False, 'properties': {'radius': {'type': 'number', 'minimum': 0, 'maximum': 200}, 'strength': {'$ref': '#/$defs/frac'}}},
            'flash': {'type': 'object', 'additionalProperties': False, 'properties': {'radius': {'type': 'number', 'minimum': 0, 'maximum': 400}, 'strength': {'type': 'number', 'minimum': 0, 'maximum': 0.9}, 'seconds': {'type': 'number', 'minimum': 0.5, 'maximum': 10}}},
            'streamers': {'type': 'object', 'additionalProperties': False, 'properties': {'count': {'type': 'integer', 'minimum': 1, 'maximum': 5}, 'length': {'type': 'number', 'minimum': 4, 'maximum': 400},
                          'wave': {'type': 'number', 'minimum': 0, 'maximum': 40}, 'color': {'$ref': '#/$defs/color'}, 'grow': {'type': 'number', 'minimum': 0, 'maximum': 600}}}}}}},
        ['art', 'size']),
    layer('glare', {'source': {'$ref': '#/$defs/id'}, 'trigger': {'enum': ['tilt', 'never']}, 'peak': {'type': 'number', 'minimum': 0, 'maximum': 0.9},
                    'bloom': {'type': 'number', 'minimum': 0, 'maximum': 1200},
                    'ghosts': {'type': 'array', 'maxItems': 8, 'items': {'type': 'array', 'minItems': 3, 'maxItems': 3, 'items': {'type': 'number', 'minimum': 0, 'maximum': 200}}}},
          ['source', 'trigger']),

    layer('image-path', {'slot': {'$ref': '#/$defs/slotId'}, 'points': {'type': 'array', 'minItems': 2, 'maxItems': 64, 'items': {'$ref': '#/$defs/point'}},
                         'by': {'$ref': '#/$defs/binding'}, 'marker': {'$ref': '#/$defs/color'}}, ['slot', 'points', 'by']),
]

state = {'type': 'object', 'additionalProperties': False, 'properties': {
    'blur': {'oneOf': [{'const': 'display'}, {'type': 'array', 'maxItems': 24, 'items': {'$ref': '#/$defs/id'}}]},
    'caption': {'$ref': '#/$defs/template'}, 'show': {'type': 'array', 'maxItems': 12, 'items': {'$ref': '#/$defs/id'}}, 'freeze': {'type': 'boolean'}}}

SCHEMA = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema', '$id': 'https://elapsed.io/schemas/mode-recipe-1.json',
    'title': 'elapsed display-mode recipe, version 1', '$defs': D, 'type': 'object', 'additionalProperties': False,
    'required': ['recipe', 'id', 'name', 'measure', 'layers', 'results'],
    'properties': {
        'recipe': {'const': 1}, 'id': {'$ref': '#/$defs/id'}, 'name': {'$ref': '#/$defs/label'},
        'visibility': {'enum': ['public', 'test']},
        'icon': {'oneOf': [{'enum': ['digits', 'ring', 'timeline', 'analog', 'ocean', 'height', 'tree', 'space']}, {'type': 'string', 'pattern': '^slot:[a-z][a-z0-9-]{0,31}(\\.[a-z0-9-]{1,32}){0,2}$'}]},
        'measure': {'type': 'object', 'additionalProperties': False, 'required': ['unit', 'perMinute'], 'properties': {
            'unit': {'enum': ['time', 'm', 'km', 'au', 'years', 'turns', 'percent', 'custom']}, 'unitLabel': {'$ref': '#/$defs/label'},
            'perMinute': {'type': 'number', 'minimum': 0, 'maximum': 1000000}, 'start': {'type': 'number'}, 'max': {'type': 'number'},
            'decimals': {'type': 'integer', 'minimum': 0, 'maximum': 3}, 'records': {'enum': ['comparable', 'mode-only']}}},
        'cycles': {'type': 'array', 'maxItems': 4, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['id', 'minutes'], 'properties': {
            'id': {'$ref': '#/$defs/id'}, 'minutes': {'type': 'number', 'minimum': 0.1, 'maximum': 100000},
            'phases': {'type': 'array', 'maxItems': 12, 'items': {'type': 'array', 'minItems': 3, 'maxItems': 3}}}}},
        'zones': {'type': 'array', 'maxItems': 16, 'items': {'type': 'array', 'minItems': 3, 'maxItems': 3}},
        'environment': {'oneOf': [
            {'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'theme'}}},
            {'type': 'object', 'additionalProperties': False, 'required': ['type', 'stops'], 'properties': {'type': {'const': 'stops'}, 'by': {'$ref': '#/$defs/source'},
                'stops': {'type': 'array', 'minItems': 2, 'maxItems': 16, 'items': {'type': 'array', 'minItems': 2, 'maxItems': 2}}}},
            {'type': 'object', 'additionalProperties': False, 'required': ['type', 'base', 'k'], 'properties': {'type': {'const': 'light-falloff'},
                'base': {'type': 'array', 'items': {'$ref': '#/$defs/frac'}, 'minItems': 3, 'maxItems': 3},
                'k': {'type': 'array', 'items': {'type': 'number', 'minimum': 0, 'maximum': 5}, 'minItems': 3, 'maxItems': 3},
                'per': {'type': 'number', 'minimum': 1, 'maximum': 1000000}, 'spread': {'type': 'number', 'minimum': 0}, 'resultsDim': {'type': 'number', 'minimum': 0.4, 'maximum': 1}, 'dim': {'type': 'number', 'minimum': 0.3, 'maximum': 1}}}]},
        'contrast': {'type': 'object', 'additionalProperties': False, 'properties': {'light': {'$ref': '#/$defs/color'}, 'dark': {'$ref': '#/$defs/color'}, 'auto': {'type': 'boolean'}}},
        'camera': {'oneOf': [{'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'fixed'}}},
                             {'type': 'object', 'additionalProperties': False, 'required': ['type', 'pxPerUnit', 'follow'], 'properties': {'type': {'const': 'rig'},
                                 'pxPerUnit': {'type': 'number', 'minimum': 0.01, 'maximum': 1000},
                                 'follow': {'type': 'object', 'additionalProperties': False, 'required': ['subject'], 'properties': {'subject': {'$ref': '#/$defs/id'}, 'damping': {'type': 'number', 'minimum': 0.1, 'maximum': 10}}},
                                 'tilt': {'type': 'object', 'additionalProperties': False, 'properties': {'px': {'type': 'number', 'minimum': -600, 'maximum': 600}, 'start': {'type': 'number', 'minimum': 0, 'maximum': 60},
                                          'over': {'type': 'number', 'minimum': 0.1, 'maximum': 30}, 'ease': {'enum': ['smooth', 'linear']}, 'skyShift': {'type': 'number', 'minimum': 0}}}}},
                             {'type': 'object', 'additionalProperties': False, 'required': ['type', 'anchor', 'angle'], 'properties': {'type': {'const': 'follow-zoom'},
                                 'anchor': {'$ref': '#/$defs/point'}, 'angle': {'type': 'number', 'minimum': -180, 'maximum': 180},
                                 'resultsAngle': {'type': 'number', 'minimum': -180, 'maximum': 180},
                                 'usable': {'type': 'number', 'minimum': 0.4, 'maximum': 0.95}, 'minValue': {'type': 'number', 'minimum': 0}}}]},
        'layers': {'type': 'array', 'minItems': 1, 'maxItems': 24, 'items': {'oneOf': LAYERS}},
        'states': {'type': 'object', 'additionalProperties': False, 'properties': {'paused': state, 'checkin': state}},
        'results': {'type': 'object', 'additionalProperties': False, 'required': ['replay', 'view'], 'properties': {
            'replay': {'type': 'object', 'additionalProperties': False, 'required': ['seconds', 'easing'], 'properties': {
                'seconds': {'type': 'number', 'minimum': 0.5, 'maximum': 4}, 'easing': {'enum': ['fast', 'gentle']}, 'longSessionExtra': {'type': 'boolean'}}},
            'view': {'oneOf': [
                {'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'strip'}}},
                {'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'rings-per-hour'}, 'hand': {'type': 'boolean'}, 'fitAfterHours': {'type': 'number', 'minimum': 1, 'maximum': 16}}},
                {'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'profile'}, 'direction': {'enum': ['down', 'up']}}},
                {'type': 'object', 'additionalProperties': False, 'required': ['type', 'layers'], 'properties': {'type': {'const': 'scene'}, 'layers': {'type': 'array', 'maxItems': 24, 'items': {'$ref': '#/$defs/id'}}, 'camera': {'type': 'boolean'}}}]},
            'card': {'type': 'object', 'additionalProperties': False, 'properties': {'environment': {'enum': ['theme', 'follow-replay']}, 'startFrom': {'enum': ['start', 'session-end']}, 'crossSeconds': {'type': 'number', 'minimum': 0, 'maximum': 2}}},
            'show': {'type': 'array', 'maxItems': 12, 'items': {'$ref': '#/$defs/id'}},
            'finale': {'type': 'array', 'maxItems': 3, 'items': {'oneOf': [
                {'type': 'object', 'additionalProperties': False, 'required': ['type'], 'properties': {'type': {'const': 'ping'}, 'count': {'type': 'integer', 'minimum': 1, 'maximum': 4}, 'color': {'$ref': '#/$defs/color'}}},
                {'type': 'object', 'additionalProperties': False, 'required': ['type', 'layer'], 'properties': {'type': {'const': 'show'}, 'layer': {'$ref': '#/$defs/id'}}}]}}}},
        'options': {'type': 'array', 'maxItems': 6, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['id', 'label', 'kind', 'default'], 'properties': {
            'id': {'$ref': '#/$defs/id'}, 'label': {'$ref': '#/$defs/label'}, 'kind': {'enum': ['switch', 'segmented']},
            'choices': {'type': 'array', 'maxItems': 4, 'items': {'$ref': '#/$defs/label'}}, 'default': {'type': ['string', 'boolean']},
            'toggles': {'type': 'array', 'maxItems': 12, 'items': {'$ref': '#/$defs/id'}}}}},
        'slots': {'type': 'array', 'maxItems': 32, 'items': {'type': 'object', 'additionalProperties': False, 'required': ['id', 'kind', 'default'], 'properties': {
            'id': {'$ref': '#/$defs/slotId'}, 'kind': {'enum': ['image', 'image-strip', 'star-catalog', 'landmark-list']},
            'frames': {'type': 'integer', 'minimum': 1, 'maximum': 48}, 'size': {'type': 'array', 'items': {'type': 'integer', 'minimum': 8, 'maximum': 4096}, 'minItems': 2, 'maxItems': 2},
            'default': {'type': 'string', 'pattern': '^builtin:[a-z0-9./-]{1,64}$'}}}},
    }}

# ---------------- the eight modes ----------------
T = {'type': 'theme'}
def sl(i, kind, default, **kw): return dict(id=i, kind=kind, default='builtin:' + default, **kw)
R = {}
R['digits'] = dict(recipe=1, id='digits', name='digits', icon='digits', measure=dict(unit='time', perMinute=1), environment=T,
    layers=[dict(type='time', id='time', size=104, position='center', seconds='setting')],
    states=dict(paused=dict(blur='display'), checkin=dict(blur='display')),
    results=dict(replay=dict(seconds=1.4, easing='fast', longSessionExtra=True), view=dict(type='strip')))
R['ring'] = dict(recipe=1, id='ring', name='ring', icon='ring', measure=dict(unit='time', perMinute=1), environment=T, cycles=[dict(id='hour', minutes=60)],
    layers=[dict(type='ring', id='ring', cycle='hour', radius=112, thickness=8, track='theme.faint', fill='theme.accent', tail=dict(degrees=55, growIn=True, fade='ease'), head=dict(size=8)),
            dict(type='time', id='time', size=52, position='center', seconds='setting')],
    states=dict(paused=dict(blur='display'), checkin=dict(blur='display')),
    results=dict(replay=dict(seconds=2.0, easing='fast', longSessionExtra=True), view=dict(type='rings-per-hour', hand=True, fitAfterHours=6)))
R['timeline'] = dict(recipe=1, id='timeline', name='timeline', icon='timeline', measure=dict(unit='time', perMinute=1), environment=T,
    layers=[dict(type='time', id='time', size=56, position=[0.5, 0.42], seconds='setting'),
            dict(type='track', id='track', width=480, pxPerMinute=10, ticks={'every': 5, 'labelEvery': 10, 'format': 'hh:mm'}, fadeEnds=True, past='theme.muted', future='theme.faint',
                 drawBeforeStart=False, marker=dict(source='personal-record', label='pr: {time}', color='theme.pr'))],
    states=dict(paused=dict(blur='display'), checkin=dict(blur='display')),
    results=dict(replay=dict(seconds=2.0, easing='fast', longSessionExtra=True), view=dict(type='strip')))
R['analog'] = dict(recipe=1, id='analog', name='analog stopwatch', icon='analog', measure=dict(unit='time', perMinute=1), environment=T,
    cycles=[dict(id='hour', minutes=60), dict(id='half-day', minutes=720)],
    layers=[dict(type='dial', id='dial', cycle='hour', radius=150, ticks=dict(major=12, minor=60), labels=dict(count=12, format='minutes'),
                 hand=dict(length=140, width=2, color='theme.accent'),
                 subdials=[dict(cycle='half-day', radius=34, offset=[0, 52], labels=12, hand=dict(length=26, width=1.5, color='theme.text'))])],
    states=dict(paused=dict(blur='display'), checkin=dict(blur='display')),
    results=dict(replay=dict(seconds=2.0, easing='fast', longSessionExtra=True), view=dict(type='rings-per-hour', hand=True, fitAfterHours=6)))
OCEAN_ZONES = [['sunlight', 'sunlight zone', 0], ['twilight', 'twilight zone', 200], ['midnight', 'midnight zone', 1000], ['abyssal', 'abyssal zone', 4000], ['hadal', 'hadal zone', 6000]]
R['ocean-depth'] = dict(recipe=1, id='ocean-depth', name='ocean depth', icon='ocean',
    measure=dict(unit='m', perMinute=15, max=10935, records='comparable'), zones=OCEAN_ZONES,
    environment={'type': 'light-falloff', 'base': [0.0232, 0.212, 0.392], 'k': [0.30, 0.06, 0.023], 'per': 1, 'spread': 6, 'resultsDim': 0.8, 'dim': 0.6},
    cycles=[dict(id='glow-drift', minutes=0.78), dict(id='glow-breathe', minutes=0.62), dict(id='glow-bright', minutes=0.68)],
    contrast=dict(light='#DCE8EE', dark='#0E2440', auto=True),
    layers=[
            # idle: calm water; its middle colour is the light model at 0 m (dim 0.6), where the dive begins
            dict(type='shape', id='calm', when=['idle'], shape='rect', size=[720, 450], x=0, y=0, fill={'linear': [[0, '#2A7398'], [0.45, '#1F6485'], [1, '#0E3F5E']]}),
            # a soft glow from above, drifting side to side and breathing on slow loops
            dict(type='shape', id='glow', when=['idle'], shape='ellipse', size=[1080, 660], y=-70, fill={'radial': [[0, '#E6F8FF'], [0.45, '#E6F8FF40'], [1, '#E6F8FF00']]},
                 x={'by': 'cycle:glow-drift', 'stops': [[0, 360], [0.25, 520], [0.5, 360], [0.75, 200], [1, 360]], 'ease': 'smooth'},
                 scale={'by': 'cycle:glow-breathe', 'stops': [[0, 1], [0.5, 1.08], [1, 1]], 'ease': 'smooth'},
                 opacity={'by': 'cycle:glow-bright', 'stops': [[0, 0.2], [0.5, 0.24], [1, 0.2]], 'ease': 'smooth'}),
            # marine snow: specks in three depths, sinking and swaying forever, far small and slow, near larger and faster
            dict(type='particles', id='snow', when=['idle'], shape='dot', every=[1, 1], maxAtOnce=1, colors=['#DDF1FF'], depths=3,
                 size={'scale': [0.4, 2.0]}, field={'count': 86, 'crossSeconds': [90, 60, 38], 'swayPx': [6, 10, 16], 'swaySeconds': [47, 31, 23]}),
            dict(type='time', id='time', size=104, position='center', seconds='setting'),
            dict(type='particles', id='ocean-life', when=['paused'], shape='image', catalogByZone={'sunlight': ['ocean.fish-school', 'ocean.turtle'], 'twilight': ['ocean.jellyfish', 'ocean.whale'],
                 'midnight': ['ocean.squid-lights'], 'abyssal': ['ocean.anglerfish'], 'hadal': ['ocean.snailfish']},
                 every=[3, 9], maxAtOnce=4, lifetime=[8, 20], size={'scale': [0.5, 1.2]}, depths=3, arrive='drift-in', leaveOnResume=True, blurOnPause=False),
            dict(type='passing', id='passing', when=['results'], direction='up', items=[
                dict(slot='ocean.fish-school', **{'from': 0, 'to': 260}, x=0.65, opacity=0.55), dict(slot='ocean.turtle', **{'from': 40, 'to': 420}, x=0.12, opacity=0.5),
                dict(slot='ocean.whale', **{'from': 220, 'to': 1250}, x=0.53, opacity=0.45), dict(slot='ocean.jellyfish', **{'from': 320, 'to': 1150}, x=0.2, opacity=0.9),
                dict(slot='ocean.squid-lights', **{'from': 900, 'to': 2650}, x=0.72, opacity=1)]),
            dict(type='landmarks', id='landmarks', when=['results'], slot='ocean.landmarks', anchor='chart', perBand=dict(size=1000, max=2), maxTotal=6, dot='#F2C46B',
                 labels=dict(pop=True, fadeAfterReplay=True, hover=True, template='{landmark} · {value} m'))],
    states=dict(paused=dict(blur=['time'], caption='{value} m · {zone}', show=['ocean-life']), checkin=dict(blur=['time'])),
    results=dict(replay=dict(seconds=3.0, easing='gentle', longSessionExtra=True), view=dict(type='profile', direction='down'),
                 card=dict(environment='follow-replay', startFrom='session-end', crossSeconds=0.35), show=['passing', 'landmarks'], finale=[dict(type='ping', count=2, color='#BFE9FF')]),
    options=[dict(id='ocean-life', label='ocean life', kind='switch', default=True, toggles=['ocean-life']),
             dict(id='landmarks', label='results landmarks', kind='switch', default=True, toggles=['landmarks'])],
    slots=[sl('ocean.fish-school', 'image', 'ocean/fish-school.svg'), sl('ocean.turtle', 'image', 'ocean/turtle.svg'), sl('ocean.whale', 'image', 'ocean/whale.svg'),
           sl('ocean.jellyfish', 'image', 'ocean/jellyfish.svg'), sl('ocean.squid-lights', 'image', 'ocean/squid-lights.svg'), sl('ocean.anglerfish', 'image', 'ocean/anglerfish.svg'),
           sl('ocean.snailfish', 'image', 'ocean/snailfish.svg'), sl('ocean.landmarks', 'landmark-list', 'ocean/landmarks.json')])
R['height'] = dict(recipe=1, id='height', name='height', icon='height',
    measure=dict(unit='m', perMinute=140, max=100000, records='comparable'),
    zones=[['troposphere', 'troposphere', 0], ['stratosphere', 'stratosphere', 12000], ['mesosphere', 'mesosphere', 50000], ['thermosphere', 'thermosphere', 85000]],
    # the painted sky by altitude; the camera's upward tilt looks into higher, deeper sky
    environment={'type': 'stops', 'by': 'measure', 'stops': [[0, '#86BCE4'], [1000, '#78B0DF'], [5000, '#5A93CF'], [9000, '#3F75BA'], [15000, '#285593'], [25000, '#163266'], [40000, '#0B1A3B']]},
    contrast=dict(light='#F3F6FB', dark='#1F2A3A', auto=True),
    # a camera that follows the falcon, critically damped (no lurch, no overshoot), then tilts up toward the sun
    camera={'type': 'rig', 'pxPerUnit': 50, 'follow': {'subject': 'falcon', 'damping': 0.9},
            'tilt': {'px': 170, 'start': 1.1, 'over': 2.5, 'ease': 'smooth', 'skyShift': 2600}},
    layers=[
        dict(type='shape', id='sun', space='sky', shape='circle', size=[140, 140], x=604, y=112, fill={'radial': [[0, '#FFF6DD'], [0.35, '#FFF1D0'], [1, '#FFF1D000']]},
             opacity={'by': 'measure', 'stops': [[6000, 1], [18000, 0]], 'ease': 'smooth'}),
        dict(type='starfield', id='stars', slot='sky.stars', magnitudeMax=5, opacity={'by': 'measure', 'stops': [[18000, 0], [42000, 1]], 'ease': 'smooth'}),
        # the landscape: each layer moves by the camera's movement divided by its distance, and repeats sideways
        dict(type='scenery', id='hills', preset='hills', baseY=0.747, color='#B7CAD6', distance=40, tileX=True, seed=7, opacity={'by': 'measure', 'stops': [[90, 1], [310, 0]], 'ease': 'smooth'}),
        dict(type='scenery', id='far-forest', preset='conifers', baseY=0.836, height=[22, 40], color='#9CB3C2', distance=19, tileX=True, seed=11, opacity={'by': 'measure', 'stops': [[90, 1], [310, 0]], 'ease': 'smooth'}),
        dict(type='scenery', id='mid-forest', preset='conifers', baseY=0.92, height=[34, 58], color='#76958E', distance=13.5, tileX=True, seed=12, opacity={'by': 'measure', 'stops': [[90, 1], [310, 0]], 'ease': 'smooth'}),
        dict(type='scenery', id='near-forest', preset='conifers', baseY=1.018, height=[50, 84], color='#507459', distance=10, tileX=True, seed=13, opacity={'by': 'measure', 'stops': [[90, 1], [310, 0]], 'ease': 'smooth'}),
        # the falcon: enters from the left half a second after start, keeps its speed, turns into a thermal and climbs at the measure's rate
        dict(type='subject', id='falcon', art={'preset': 'falcon', 'color': '#2B303B'}, size=20, position=[0.5, 0.836],
             entry={'from': [-0.08, 1.04], 'delay': 0.5, 'speed': 200},
             motion={'forwardSpeed': 200, 'forwardDecay': 3, 'climbFrom': 'measure', 'climbRamp': 2},
             flight={'flapHz': 2.2, 'downstrokeShare': 0.55, 'upstrokeFold': 0.3, 'pattern': [{'flap': 1}, {'glide': 60}], 'glideAngle': -36, 'glideWobble': 2.4, 'steady': True},
             # above the highest bird ever recorded, it becomes a glowing white angel with long streamers
             stages=[{'from': 11300, 'label': 'angel', 'color': '#FFFFFF', 'crossfade': 2.5,
                      'halo': {'radius': 34, 'strength': 0.75}, 'flash': {'radius': 90, 'strength': 0.9, 'seconds': 1.1},
                      'streamers': {'count': 3, 'length': 95, 'wave': 5.5, 'color': '#FFFFFF', 'grow': 2.6}}]),
        # a lens glare, in circles, peaking while the camera tilts toward the sun
        dict(type='glare', id='glare', source='sun', trigger='tilt', peak=0.85, bloom=300,
             ghosts=[[0.18, 9, 0.12], [0.34, 18, 0.09], [0.5, 34, 0.06], [0.64, 12, 0.12], [0.78, 24, 0.07], [0.92, 15, 0.1]]),
        dict(type='time', id='time', size=104, position='center', seconds='setting'),
        dict(type='passing', id='passing', when=['results'], direction='down', items=[
            dict(slot='sky.birds', **{'from': 0, 'to': 2600}, x=0.7, opacity=0.8), dict(slot='sky.cloud', **{'from': 600, 'to': 6000}, x=0.11, opacity=0.9),
            dict(slot='sky.cloud', **{'from': 2500, 'to': 11500}, x=0.6, opacity=0.85), dict(slot='sky.airliner', **{'from': 8800, 'to': 12800}, x=0.35, opacity=0.95),
            dict(slot='sky.balloon', **{'from': 15000, 'to': 34000}, x=0.78, opacity=0.95)]),
        dict(type='shape', id='horizon', when=['results'], shape='circle', size=[3200, 3200], x=0.5,
             y={'by': 'measure', 'stops': [[15000, 530], [23000, 460], [100000, 410]], 'ease': 'smooth'},
             opacity={'by': 'measure', 'stops': [[15000, 0], [23000, 1]], 'ease': 'smooth'},
             fill={'radial': [[0, '#0B2A4E'], [0.92, '#0B2A4E'], [0.988, '#2B6FB0'], [1, '#78BEFF00']]}, glow=dict(blur=40, color='#6EB4FF73')),
        dict(type='landmarks', id='landmarks', when=['results'], slot='sky.landmarks', anchor='chart', perBand=dict(size=10000, max=2), maxTotal=6, dot='#F2C46B',
             labels=dict(pop=True, fadeAfterReplay=True, hover=True, template='{landmark} · {value} m'))],
    # paused: the whole scene freezes where it is; only the time blurs
    states=dict(paused=dict(blur=['time'], caption='{value} m · {zone}', freeze=True), checkin=dict(blur=['time'], freeze=True)),
    # the results stay as they are
    results=dict(replay=dict(seconds=3.0, easing='gentle', longSessionExtra=True), view=dict(type='profile', direction='up'),
                 card=dict(environment='follow-replay', startFrom='session-end', crossSeconds=0.35), show=['stars', 'passing', 'horizon', 'landmarks']),
    options=[dict(id='landmarks', label='results landmarks', kind='switch', default=True, toggles=['landmarks'])],
    slots=[sl('sky.stars', 'star-catalog', 'stars/hyg-mag5.json'), sl('sky.birds', 'image', 'sky/birds.svg'), sl('sky.cloud', 'image', 'sky/cloud.svg'),
           sl('sky.airliner', 'image', 'sky/airliner.svg'), sl('sky.balloon', 'image', 'sky/balloon.svg'), sl('sky.landmarks', 'landmark-list', 'sky/landmarks.json')])
SEASONS = [['spring', 0, 0.25], ['summer', 0.25, 0.5], ['autumn', 0.5, 0.75], ['winter', 0.75, 1]]
tree = lambda view, ground: dict(type='tree', id='tree-' + view, view=view, year='year', variantOf=dict(option='tree-view', value=view),
    growth={'by': 'measure', 'stops': [[0, 0.45], [60, 1]], 'ease': 'smooth'},
    leaves=dict(clusters=70, offsetMax=0.25, spring=['#C2DE8E', '#86C060'], summer=['#3E8B47'], autumn=['#D9822F', '#A9502A'], fallBy='autumn-end'),
    snow=dict(phase='winter', branches=True, ground=True), trunk='#6E4636', ground=ground, grass='#7FAF5A')
R['tree'] = dict(recipe=1, id='tree', name='tree', icon='tree', measure=dict(unit='years', perMinute=1 / 60, records='mode-only'),
    cycles=[dict(id='year', minutes=60, phases=SEASONS)], environment=T,
    layers=[tree('side', 'line'), tree('isometric', 'field'),
            dict(type='sprite', id='tree-art', slot='tree.seasons', frames=4, frameBy={'cycle': 'year'}, crossfade=180, position='center', size=[360, 300],
                 scale={'by': 'measure', 'stops': [[0, 0.45], [1, 1]], 'ease': 'smooth'}, variantOf=dict(option='tree-view', value='your art')),
            dict(type='particles', id='falling-snow', when=['running', 'paused'], shape='flake', visibleWhen={'phase': 'winter'}, every=[0.5, 1.5], maxAtOnce=12,
                 lifetime=[4, 8], size={'scale': [0.6, 1.4]}, colors=['#FFFFFF'], angle=[80, 100], distance=[200, 320], blurOnPause=False),
            dict(type='time', id='time', size=30, position='top', seconds='setting')],
    states=dict(paused=dict(blur=['time']), checkin=dict(blur=['time'])),
    results=dict(replay=dict(seconds=3.0, easing='gentle', longSessionExtra=True), view=dict(type='scene', layers=['tree-side', 'tree-isometric', 'tree-art'], camera=False)),
    options=[dict(id='tree-view', label='tree view', kind='segmented', choices=['side', 'isometric', 'your art'], default='side')],
    slots=[sl('tree.seasons', 'image-strip', 'tree/seasons-strip.png', frames=4, size=[360, 300])])
PLANETS = [[0.39, 'mercury'], [0.72, 'venus'], [1.0, 'earth'], [1.52, 'mars'], [5.2, 'jupiter'], [9.54, 'saturn'], [19.2, 'uranus'], [30.1, 'neptune']]
R['interstellar'] = dict(recipe=1, id='interstellar', name='interstellar', icon='space', visibility='test',
    measure=dict(unit='au', perMinute=0.1202, start=1, decimals=1, records='comparable'),
    zones=[[n, 'past ' + n, au] for au, n in PLANETS[3:]] + [['kuiper', 'past the kuiper belt', 50], ['heliopause', 'past the heliopause', 120]],
    environment={'type': 'stops', 'by': 'measure', 'stops': [[0, '#03040A'], [1, '#03040A']]},
    contrast=dict(light='#E8ECF6', dark='#0E2440', auto=False),
    camera=dict(type='follow-zoom', anchor=[0.1, 0.87], angle=-28, resultsAngle=-17, usable=0.85, minValue=1.6),
    layers=[dict(type='starfield', id='stars', slot='space.stars', magnitudeMax=5, blurOnPause=False, projection=dict(type='gnomonic', ra=5.5, dec=6, pxPerDegree=8),
                 radius={'min': 0.7, 'at0': 2.7, 'perMagnitude': -0.42}, pan=dict(when=['paused'], turnMinutes=6)),
            dict(type='circles', id='orbits', space='camera', color='#7A86B0', fadeBelowPx=6,
                 items=[dict(at=au, label=n) for au, n in PLANETS] + [dict(at=50, label='kuiper belt edge', dashed=True), dict(at=120, label='heliopause', dashed=True)]),
            dict(type='shape', id='sun', space='camera', shape='circle', size=[8, 8], x=0, y=0, fill='#FFF1CF', glow=dict(blur=10, color='#FFE7B029')),
            dict(type='path', id='route', space='camera', **{'from': 1}, color='#C9D3F0', width=1.3, head=dict(size=7, color='#FFFFFF')),
            dict(type='landmarks', id='landmarks', space='camera', slot='space.landmarks', anchor='path', maxTotal=8, dot='#F2C46B', fadeBelowPx=14,
                 labels=dict(pop=True, fadeAfterReplay=False, hover=True, template='{landmark}')),
            dict(type='particles', id='comets', when=['paused', 'results'], shape='comet', every=[3, 7], maxAtOnce=2, lifetime=[8, 11],
                 size={'head': [4, 8], 'length': [50, 110]}, colors=['#BEE2FF', '#FFE2AA', '#D2F0FF'], orient='away-from-anchor', blurOnPause=False),
            dict(type='time', id='time', size=104, position='center', seconds='setting')],
    states=dict(paused=dict(blur=['orbits', 'sun', 'route', 'landmarks', 'time'], caption='{distance} au travelled · {zone}', show=['comets']), checkin=dict(blur='display')),
    results=dict(replay=dict(seconds=2.0, easing='fast', longSessionExtra=True), view=dict(type='scene', layers=['stars', 'orbits', 'sun', 'route', 'landmarks', 'comets'], camera=True)),
    slots=[sl('space.stars', 'star-catalog', 'stars/hyg-mag5.json'), sl('space.landmarks', 'landmark-list', 'space/landmarks.json')])

# ---------------- coverage: every feature the plan gives each mode ----------------
def L(r, t): return [l for l in r['layers'] if l['type'] == t]
def has(r, path):
    cur = r
    for k in path.split('.'):
        if isinstance(cur, list): cur = [c for c in cur if isinstance(c, dict) and (c.get('id') == k or c.get('type') == k)]; cur = cur[0] if cur else None
        elif isinstance(cur, dict): cur = cur.get(k)
        if cur is None: return False
    return True
COVER = {
 'digits': [('seconds blur-away follows the setting', lambda r: L(r, 'time')[0]['seconds'] == 'setting'), ('whole display blurs on pause', lambda r: r['states']['paused']['blur'] == 'display'),
            ('focus strip replay, 1.4 s fast', lambda r: r['results']['view']['type'] == 'strip' and r['results']['replay'] == dict(seconds=1.4, easing='fast', longSessionExtra=True))],
 'ring': [('one turn an hour', lambda r: r['cycles'][0]['minutes'] == 60), ('55° tail that grows in and fades', lambda r: L(r, 'ring')[0]['tail'] == dict(degrees=55, growIn=True, fade='ease')),
          ('round head', lambda r: L(r, 'ring')[0]['head']['size'] > 0), ('rings-per-hour replay behind the hand, tighter past 6 h', lambda r: r['results']['view'] == dict(type='rings-per-hour', hand=True, fitAfterHours=6))],
 'timeline': [('480 px track, 10 px a minute', lambda r: L(r, 'track')[0]['width'] == 480 and L(r, 'track')[0]['pxPerMinute'] == 10), ('faded ends, nothing before start', lambda r: L(r, 'track')[0]['fadeEnds'] and not L(r, 'track')[0]['drawBeforeStart']),
              ('personal record marker', lambda r: L(r, 'track')[0]['marker']['source'] == 'personal-record'), ('56 px time', lambda r: L(r, 'time')[0]['size'] == 56)],
 'analog': [('one turn an hour, labels every 5 minutes', lambda r: L(r, 'dial')[0]['labels']['count'] == 12), ('hours subdial', lambda r: L(r, 'dial')[0]['subdials'][0]['cycle'] == 'half-day'),
            ('accent hand', lambda r: L(r, 'dial')[0]['hand']['color'] == 'theme.accent')],
 'ocean-depth': [('idle: calm water whose middle is where the dive begins', lambda r: next(l for l in L(r, 'shape') if l['id'] == 'calm')['fill']['linear'][1] == [0.45, '#1F6485']),
 ('idle: a glow drifting and breathing on slow loops', lambda r: next(l for l in L(r, 'shape') if l['id'] == 'glow')['x']['by'] == 'cycle:glow-drift'),
 ('idle: marine snow in three depths, sinking and swaying', lambda r: next(l for l in L(r, 'particles') if l['id'] == 'snow')['field']['crossSeconds'] == [90, 60, 38]),
                 ('the light model dimmed for readable text, the same idle and running', lambda r: r['environment']['dim'] == 0.6),
                 ('15 m a minute to 10,935 m', lambda r: r['measure']['perMinute'] == 15 and r['measure']['max'] == 10935), ('light model with ±6 m gradient', lambda r: r['environment']['spread'] == 6),
                 ('text switches for contrast', lambda r: r['contrast']['auto']), ('ocean life by zone on pause at 3 distances, leaving on resume', lambda r: next(l for l in L(r, 'particles') if l['id'] == 'ocean-life')['depths'] == 3 and next(l for l in L(r, 'particles') if l['id'] == 'ocean-life')['leaveOnResume']),
                 ('paused caption', lambda r: '{zone}' in r['states']['paused']['caption']), ('lit results from the session-end colour', lambda r: r['results']['card']['startFrom'] == 'session-end'),
                 ('things rise past on results', lambda r: L(r, 'passing')[0]['direction'] == 'up'), ('sonar ping finale', lambda r: r['results']['finale'][0]['type'] == 'ping'),
                 ('≤2 landmarks per 1,000 m, ≤6, pop, fade, hover', lambda r: L(r, 'landmarks')[0]['perBand'] == dict(size=1000, max=2) and L(r, 'landmarks')[0]['maxTotal'] == 6 and all(L(r, 'landmarks')[0]['labels'][k] for k in ('pop', 'fadeAfterReplay', 'hover'))),
                 ('3 s gentle replay', lambda r: r['results']['replay']['easing'] == 'gentle'), ('ocean life and landmark switches', lambda r: [o['id'] for o in r['options']] == ['ocean-life', 'landmarks'])],
 'height': [('140 m a minute to 100 km', lambda r: r['measure']['perMinute'] == 140 and r['measure']['max'] == 100000),
            ('painted sky by altitude', lambda r: r['environment']['by'] == 'measure' and len(r['environment']['stops']) == 7),
            ('camera follows the falcon, critically damped', lambda r: r['camera']['type'] == 'rig' and r['camera']['follow'] == {'subject': 'falcon', 'damping': 0.9}),
            ('camera tilts up 170 px over 2.5 s, deepening the sky', lambda r: r['camera']['tilt']['px'] == 170 and r['camera']['tilt']['over'] == 2.5 and r['camera']['tilt']['skyShift'] == 2600),
            ('sun lives in the sky and moves only with the tilt', lambda r: L(r, 'shape')[0]['space'] == 'sky'),
            ('four landscape layers at their distances, repeating sideways', lambda r: [l['distance'] for l in L(r, 'scenery')] == [40, 19, 13.5, 10] and all(l['tileX'] for l in L(r, 'scenery'))),
            ('landscape fades into haze from 90 to 310 m', lambda r: all(l['opacity']['stops'] == [[90, 1], [310, 0]] for l in L(r, 'scenery'))),
            ('falcon, one colour, about 20 px', lambda r: L(r, 'subject')[0]['art'] == {'preset': 'falcon', 'color': '#2B303B'} and L(r, 'subject')[0]['size'] == 20),
            ('enters from the left half a second after start', lambda r: L(r, 'subject')[0]['entry']['from'][0] < 0 and L(r, 'subject')[0]['entry']['delay'] == 0.5),
            ('keeps its speed, turns into a thermal, climbs at the measure', lambda r: L(r, 'subject')[0]['motion'] == {'forwardSpeed': 200, 'forwardDecay': 3, 'climbFrom': 'measure', 'climbRamp': 2}),
            ('2.2 beats a second, 1 s flapping per 60 s gliding, steady position', lambda r: L(r, 'subject')[0]['flight']['flapHz'] == 2.2 and L(r, 'subject')[0]['flight']['pattern'] == [{'flap': 1}, {'glide': 60}] and L(r, 'subject')[0]['flight']['steady']),
            ('small irregular corrections while gliding', lambda r: L(r, 'subject')[0]['flight']['glideWobble'] > 0),
            ('above 11,300 m: a glowing white angel with three streamers', lambda r: L(r, 'subject')[0]['stages'][0]['from'] == 11300 and L(r, 'subject')[0]['stages'][0]['color'] == '#FFFFFF' and L(r, 'subject')[0]['stages'][0]['streamers']['count'] == 3),
            ('glare in circles, tied to the tilt', lambda r: L(r, 'glare')[0]['trigger'] == 'tilt' and len(L(r, 'glare')[0]['ghosts']) == 6),
            ('paused: the scene freezes', lambda r: r['states']['paused']['freeze'] is True),
            ('stars above 18 km', lambda r: L(r, 'starfield')[0]['opacity']['stops'] == [[18000, 0], [42000, 1]]),
            ('results kept: profile, lit card, things passing, horizon, landmarks', lambda r: r['results']['view'] == {'type': 'profile', 'direction': 'up'} and r['results']['show'] == ['stars', 'passing', 'horizon', 'landmarks']),
            ('own landmarks switch', lambda r: r['options'][0]['id'] == 'landmarks')],
 'tree': [('one year an hour, four seasons', lambda r: r['cycles'][0]['minutes'] == 60 and len(r['cycles'][0]['phases']) == 4), ('side and isometric views', lambda r: {l['view'] for l in L(r, 'tree')} == {'side', 'isometric'}),
          ('leaf colours per season, cluster offsets up to a quarter season, all fallen by autumn\'s end', lambda r: L(r, 'tree')[0]['leaves']['offsetMax'] == 0.25 and L(r, 'tree')[0]['leaves']['fallBy'] == 'autumn-end'),
          ('snow on branches and ground', lambda r: L(r, 'tree')[0]['snow']['branches']), ('grows to full size at 60 minutes', lambda r: L(r, 'tree')[0]['growth']['stops'][-1] == [60, 1]),
          ('your own season strip instead', lambda r: L(r, 'sprite')[0]['frames'] == 4 and r['slots'][0]['kind'] == 'image-strip')],
 'interstellar': [('light speed from Earth', lambda r: r['measure']['perMinute'] == 0.1202 and r['measure']['start'] == 1), ('follow-and-zoom camera', lambda r: r['camera']['type'] == 'follow-zoom' and r['camera']['usable'] == 0.85),
                  ('orbits fade below 6 px', lambda r: L(r, 'circles')[0]['fadeBelowPx'] == 6), ('landmarks on the travel line', lambda r: L(r, 'landmarks')[0]['anchor'] == 'path'),
                  ('comets away from the Sun, varied, ~1 per 5 s', lambda r: L(r, 'particles')[0]['orient'] == 'away-from-anchor' and L(r, 'particles')[0]['maxAtOnce'] == 2),
                  ('sky turns while paused', lambda r: L(r, 'starfield')[0]['pan']['turnMinutes'] == 6), ('paused caption with distance', lambda r: '{distance}' in r['states']['paused']['caption']),
                  ('test flag', lambda r: r['visibility'] == 'test'), ('journey replay with the camera', lambda r: r['results']['view']['camera'])],
}

os.makedirs('out/recipes', exist_ok=True)
json.dump(SCHEMA, open('out/mode-recipe-1.schema.json', 'w'), indent=2)
V = Draft202012Validator(SCHEMA)
ok = True
for k, r in R.items():
    errs = sorted(V.iter_errors(r), key=lambda e: e.path)
    for e in errs[:5]:
        ok = False; print('SCHEMA', k, list(e.path), e.message[:160])
    # every id a layer refers to must exist
    ids = {l['id'] for l in r['layers']}
    refs = []
    for s in (r.get('states') or {}).values():
        if isinstance(s.get('blur'), list): refs += s['blur']
        refs += s.get('show', [])
    refs += r['results'].get('show', []) + (r['results']['view'].get('layers') or []) + [f['layer'] for f in r['results'].get('finale', []) if f['type'] == 'show']
    for o in r.get('options', []): refs += o.get('toggles', [])
    for x in refs:
        if x not in ids: ok = False; print('REF', k, x)
    if sum(1 for l in r['layers'] if l['type'] == 'scenery') > 6 or sum(1 for l in r['layers'] if l['type'] == 'subject') > 1: ok = False; print('BUDGET', k)
    for l in r['layers']:
        if l.get('shape') == 'beam' and l.get('noOverlap'):
            gap = (l['spread'][1] - l['spread'][0]) / (l['lanes'] - 1)
            if l['widths'][1] >= gap: ok = False; print('BEAMS CAN OVERLAP', k)
    st = [x['from'] for l in r['layers'] if l['type'] == 'subject' for x in l.get('stages', [])]
    if any(b - a < r['measure']['perMinute'] for a, b in zip(sorted(st), sorted(st)[1:])): ok = False; print('STAGES TOO CLOSE', k)
    slots = {s['id'] for s in r.get('slots', [])}
    for l in r['layers']:
        for sref in [l.get('slot')] + [i['slot'] for i in l.get('items', []) if isinstance(i, dict) and 'slot' in i] + sum((v for v in (l.get('catalogByZone') or {}).values()), []):
            if sref and sref not in slots: ok = False; print('SLOT', k, sref)
    for name, test in COVER[k]:
        try: passed = bool(test(r))
        except Exception as ex: passed = False
        if not passed: ok = False; print('MISSING', k, name)
    json.dump(r, open(f'out/recipes/{k}.json', 'w'), indent=2)
print('all valid and covered' if ok else 'gaps remain', sum(len(v) for v in COVER.values()), 'features checked')
