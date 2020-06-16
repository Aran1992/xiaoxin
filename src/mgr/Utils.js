export default class Utils {
    static removeItemFromArray(array, item) {
        let index = array.findIndex(item_ => item === item_);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }

    static angle2radius(angle) {
        return angle / 180 * Math.PI;
    }

    static radius2angle(radius) {
        return radius / Math.PI * 180;
    }

    static createLinearGradientMask(width, height, colorStop) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        let gradient = ctx.createLinearGradient(0, 0, 0, height);
        colorStop.forEach(({offset, opacity}) => gradient.addColorStop(offset, `rgba(0, 0, 0, ${opacity})`));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        return canvas;
    }

    static calcPointDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    static getPathRect(path) {
        let maxX = path[0], minX = path[0], maxY = path[1], minY = path[1];
        for (let i = 0; i < path.length - 1; i += 2) {
            let x = path[i];
            let y = path[i + 1];
            if (x > maxX) {
                maxX = x;
            } else if (x < minX) {
                minX = x;
            }
            if (y > maxY) {
                maxY = y;
            } else if (y < minY) {
                minY = y;
            }
        }
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    static calcRadians(sp, ep) {
        let x = ep.x - sp.x;
        let y = ep.y - sp.y;
        if (x > 0) {
            return Math.atan(y / x);
        } else if (x < 0) {
            return Math.atan(y / x) + Math.PI;
        } else if (x === 0) {
            if (y > 0) {
                return Math.PI / 2;
            } else if (y < 0) {
                return Math.PI / 2 * 3;
            } else {
                return 0;
            }
        }
    }

    static getLast(arr) {
        return arr[arr.length - 1];
    }

    static keys(json) {
        let arr = [];
        for (let key in json) {
            if (json.hasOwnProperty(key)) {
                arr.push(key);
            }
        }
        return arr;
    }

    static values(json) {
        let arr = [];
        for (let name in json) {
            if (json.hasOwnProperty(name)) {
                arr.push(json[name]);
            }
        }
        return arr;
    }

    static getTexturePointColor(texture, x, y) {
        let canvas = document.createElement("canvas");
        canvas.width = texture.width;
        canvas.height = texture.height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(texture.baseTexture.resource.source, 0, 0, texture.width, texture.height);
        let data = ctx.getImageData(x, y, 1, 1).data;
        return data[0] * 256 * 256 + data[1] * 256 + data[2];
    }

    static isPointInRect(point, rect) {
        return point.x >= rect.x
            && point.x <= rect.x + rect.width
            && point.y >= rect.y
            && point.y <= rect.y + rect.height;
    }

    static successive(src, dst, delta) {
        if ((src < dst && src + delta > dst)
            || (src > dst && src + delta < dst)
            || src === dst) {
            return {value: dst, final: true};
        } else {
            return {value: src + delta, final: false};
        }
    }

    static randomWithWeight(weights) {
        let total = weights.reduce((sum, value) => sum + value, 0);
        let value = total * Math.random();
        let i = 0, sum = 0;
        for (; i < weights.length; i++) {
            sum += weights[i];
            if (sum > value) {
                return i;
            }
        }
        return -1;
    }

    static getCDTimeString(time) {
        let format = (value) => value < 10 ? `0${value}` : `${value}`;
        time = Math.ceil(time / 1000);
        let second = time % 60;
        time = (time - second) / 60;
        let min = time % 60;
        let hour = (time - min) / 60;
        return `${format(hour)}:${format(min)}:${format(second)}`;
    }

    static getCDTimeStringWithoutHour(time) {
        let format = (value) => value < 10 ? `0${value}` : `${value}`;
        time = Math.ceil(time / 1000);
        let second = time % 60;
        let min = (time - second) / 60;
        return `${format(min)}:${format(second)}`;
    }

    static isIOS() {
        return !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
    }

    static intList(min, max) {
        const list = [];
        for (let i = min; i <= max; i++) {
            list.push(i);
        }
        return list;
    }

    static randomChoose(list) {
        let i = Math.floor(Math.random() * list.length);
        return list[i];
    }

    static randomChooseMulti(list, count) {
        let newList = list.map(item => item);
        let resultList = [];
        while (count) {
            if (newList.length) {
                let index = Math.floor(Math.random() * newList.length);
                let [item] = newList.splice(index, 1);
                resultList.push(item);
                count--;
            } else {
                break;
            }
        }
        return resultList;
    }

    static randomInRange(min, max) {
        return min + (max - min) * Math.random();
    }

    static randomIntInRange(min, max) {
        return min + Math.floor((max - min + 1) * Math.random());
    }

    static randomList(list) {
        const newList = [];
        while (list.length) {
            const i = Math.floor(Math.random() * list.length);
            newList.push(list[i]);
            list.splice(i, 1);
        }
        return newList;
    }

    static copyProps(src, dst) {
        for (let key in dst) {
            if (dst.hasOwnProperty(key)) {
                src[key] = dst[key];
            }
        }
    }

    static getDistanceFromPointToLine(p, lp1, lp2) {
        if (lp1.x > lp2.x) {
            let temp = lp1;
            lp1 = lp2;
            lp2 = temp;
        }
        let angle = Math.atan((lp2.y - lp1.y) / (lp2.x - lp1.x));
        let height = p.y - lp1.y - Math.tan(angle) * (p.x - lp1.x);
        return Math.cos(angle) * height;
    }

    static clone(object) {
        return JSON.parse(JSON.stringify(object));
    }

    static formatName(name) {
        return name[0].toUpperCase() + name.substring(1);
    }
}
