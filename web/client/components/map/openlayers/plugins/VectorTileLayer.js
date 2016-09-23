
var Layers = require('../../../../utils/openlayers/Layers');
var ol = require('openlayers');
var objectAssign = require('object-assign');
const CoordinatesUtils = require('../../../../utils/CoordinatesUtils');
const ProxyUtils = require('../../../../utils/ProxyUtils');
const {isArray} = require('lodash');
const SecurityUtils = require('../../../../utils/SecurityUtils');


function wmsToOpenlayersOptions(options) {
    // NOTE: can we use opacity to manage visibility?
    return objectAssign({}, options.baseParams, {
        LAYERS: options.name,
        STYLES: options.style || "",
        FORMAT: options.format || 'application/x-protobuf;type=mapbox-vector',
        SRS: CoordinatesUtils.normalizeSRS(options.srs),
        CRS: CoordinatesUtils.normalizeSRS(options.srs),
        TILED: options.tiled || false,
        VERSION: options.version || "1.3.0"
    }, options.params || {});
}

function getWMSURLs( urls ) {
    return urls.map((url) => url.split("\?")[0]);
}

// Works with geosolutions proxy
function proxyTileLoadFunction(imageTile, src) {
    var newSrc = src;
    if (ProxyUtils.needProxy(src)) {
        let proxyUrl = ProxyUtils.getProxyUrl();
        newSrc = proxyUrl + encodeURIComponent(src);
    }
    imageTile.getImage().src = newSrc;
}

Layers.registerType('vectortile', {
    create: (options) => {
        const projectionExtent = [140000, 160000, 160000, 180000];
         var size = ol.extent.getWidth(projectionExtent) / 256;
         var resolutions =  [49,42,28,21,14,7,5.6,3.5,2.8,2.1,1.4,0.7,0.56,0.28];

        const urls = getWMSURLs(isArray(options.url) ? options.url : [options.url]);
        const queryParameters = wmsToOpenlayersOptions(options) || {};
        urls.forEach(url => SecurityUtils.addAuthenticationParameter(url, queryParameters));

        function tileUrlFunction(tileCoord) {
          return (options.url + options.name + '@EPSG%3A31370' + '@pbf/{z}/{x}/{y}.pbf')
              .replace('{z}', String(tileCoord[0]))
              .replace('{x}', String(tileCoord[1]))
              .replace('{y}', String((1 << tileCoord[0]) - tileCoord[2] - 1)) ;
        }

        return new ol.layer.VectorTile({
            opacity: options.opacity !== undefined ? options.opacity : 1,
            visible: options.visibility !== false,
            zIndex: options.zIndex,
            source: new ol.source.VectorTile(objectAssign({
                format: new ol.format.MVT({
                    defaultProjection: 'EPSG:31370'
                }),
                //tilePixelRatio: 16, // oversampling when > 1

                tileGrid: new ol.tilegrid.TileGrid({
                    extent: projectionExtent,
                    resolutions : resolutions
                }),
                projection: 'EPSG:31370',
                tileUrlFunction: tileUrlFunction
                //EX: /geoserver/gwc/service/tms/1.0.0/BDU:Communes@EPSG%3A31370@pbf/{z}/{x}/{y}.pbf
                //url: options.url + options.name + '@EPSG%3A31370' + '@pbf/{z}/{x}/{-y}.pbf'
            }))
        });
        /*
        return new ol.layer.Tile({
            opacity: options.opacity !== undefined ? options.opacity : 1,
            visible: options.visibility !== false,
            zIndex: options.zIndex,
            source: new ol.source.TileWMS(objectAssign({
              urls: urls,
              params: queryParameters
            }, (options.forceProxy) ? {tileLoadFunction: proxyTileLoadFunction} : {}))
        });
        */
    },
    update: (layer, newOptions, oldOptions) => {
        /*
        if (oldOptions && layer && layer.getSource() && layer.getSource().updateParams) {
            let changed = false;
            if (oldOptions.params && newOptions.params) {
                changed = Object.keys(oldOptions.params).reduce((found, param) => {
                    if (newOptions.params[param] !== oldOptions.params[param]) {
                        return true;
                    }
                    return found;
                }, false);
            } else if (!oldOptions.params && newOptions.params) {
                changed = true;
            }
            let oldParams = wmsToOpenlayersOptions(oldOptions);
            let newParams = wmsToOpenlayersOptions(newOptions);
            changed = changed || ["LAYERS", "STYLES", "FORMAT", "TRANSPARENT", "TILED", "VERSION" ].reduce((found, param) => {
                if (oldParams[param] !== newParams[param]) {
                    return true;
                }
                return found;
            }, false);

            if (changed) {
                layer.getSource().updateParams(objectAssign(newParams, newOptions.params));
            }
        }
        */
    }
});
