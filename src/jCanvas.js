/**
 * Created by Jat on 2015/9/17.
 */
var jCanvas = (function () {
    /**
	 * @property ���ͷ���
	 */
    var cls = {
        copy: function (obj) {
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; ++i) {
                    for (var k in arguments[i]) obj[k] = arguments[i][k];
                }
            }
            return obj;
        },
        or: function (a, b, c) {
            for (var i = 0; i < b.length; ++i) {
                var oi = a[b[i] + c];
                if (oi) return oi;
            }
        },
        //�¼�ģ��
        events: {
            /**
			 * @method ע���¼�
			 * @param event_name ʱ������
			 * @param callback �¼��ص�
			 */
            on: function (event_name, callback) {
                if (!this._events) this._events = {};
                if (!this._events[event_name]) this._events[event_name] = [];
                this._events[event_name].push(callback);
                return this;
            },
            /**
			 * @method ע���¼�
			 * @param event_name �¼�����
			 * @param callback Ҫע���Ļص������Ϊ����ע�����¼������лص���
			 */
            off: function (event_name, callback) {
                if (!this._events) return this;
                var el = this._events[event_name];
                if (!el) return this;
                if (!callback || (el.length == 1 && el[0] == callback)) {
                    this._events[event_name] = [];
                    delete this._events[event_name];
                }
                else {
                    for (var i = 0; i < el.length; ++i) {
                        if (el[i] == callback) {
                            el.splice(i, 1);
                            break;
                        }
                    }
                }
                return this;
            },
            /**
			 * @method �����¼�
			 * @param event_name �������¼�����
			 */
            trigger: function (event_name) {
                if (!this._events) return this;
                var el = this._events[event_name];
                if (!el || !el.length) return this;
                var args = [];
                for (var i = 1; i < arguments.length; ++i) {
                    args.push(arguments[i]);
                }
                for (var i = 0; i < el.length; ++i) {
                    el[i].apply(this, args);
                }
                return this;
            }
        },
        /**
		 * @method Ϊ�����������֧�֣����������������õ�ǰֵ���޲η��ص�ǰֵ��
		 */
        createSetter: function (name, defaultValue, setFunction) {
            return function (v) {
                if (arguments.length) {
                    if (!this._properties) this._properties = {};
                    else if (v == this._properties[name]) return this;
                    if (setFunction) setFunction.call(this, v, name);
                    this._properties[name] = v;
                    return this;
                }
                if (!this._properties || !(name in this._properties)) return defaultValue;
                return this._properties[name];
            };
        },
        /**
		 * @method Ϊ�����������֧�֣����������������õ�ǰֵ���޲η��ص�ǰֵ��
		 */
        createMethod: function (classRef, name, defaultValue, setFunction) {
            classRef.prototype[name] = this.createSetter(name, defaultValue, setFunction);
            return classRef;
        },
        /**
		 * @method Ϊ��������¼�֧��
		 */
        createEventSupport: function (classRef) {
            this.copy(classRef.prototype, this.events);
            return classRef;
        }
    };

    var v = {};
    //shapeObj----------------------------------
    //���в�����������matrix����Ч��Opacity���⣩
    var shapeObjProperties = {
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        skewX: 0,
        skewY: 0,
        left: 0,
        top: 0,
        opacity: 1
    };
    var shapeObjFeilds = {
        zIndex: 0,
        shadowColor: null,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        compositeOperation: null
    };

    //���ֶ���
    var shapeObj = (function () {
        var t = function () { };
        //�¼�֧��
        cls.createEventSupport(t);
        //����
        var _setFunction = function (v, name) {
            this._ischanged = true;
            if (name) {
                this.trigger("changed", name, v);
                this.trigger(name, v);
            }
            if (this._parent) this._parent.triggerChanged();
        };
        t.prototype.triggerChanged = _setFunction;
        for (var i in shapeObjFeilds) cls.createMethod(t, i, shapeObjFeilds[i], _setFunction);

        //matrix
        //����
        var _setMatrix = function (v, name) {
            this.triggerChanged(v, name);
            if (!this._hasTransform) this._hasTransform = true;
        };
        for (var i in shapeObjProperties) cls.createMethod(t, i, shapeObjProperties[i], _setMatrix);
        //scale
        t.prototype.scale = function (v) {
            if (!arguments.length) return this.scaleX();
            this.scaleX(v);
            this.scaleY(v);
            this.trigger("scale", v);
            return this;
        };
        //skew
        t.prototype.skew = function (v) {
            if (!arguments.length) return this.skewX();
            this.skewX(v);
            this.skewY(v);
            this.trigger("skew", v);
            return this;
        };
        cls.createMethod(t, 'matrix', null, _setMatrix);

        return t;
    })();

    //����
    var asGroup = (function () {
        //���
        var append = function () {
            for (var i = 0; i < arguments.length; ++i) {
                var o = arguments[i];
                if (o._parent == this) continue;
                if (o._parent) o.remove();
                o._parent = this;
                if (!this._children) this._children = {};
                this._children[o._id] = o;
                o.trigger("append", o);
                this.trigger("appendChild", o);
            }
            this.triggerChanged();
            return this;
        };
        //ɾ��
        var removeChildren = function () {
            if (!this._children) return this;
            for (var i = 0; i < arguments.length; ++i) {
                var o = arguments[i];
                if (o._parent != this) continue;
                delete this._children[o._id];
                o.trigger("remove", o);
                o._parent = undefined;
                this.trigger("removeChild", o);
            }
            this.triggerChanged();
            return this;
        };
        var removeAllChildren = function () {
            if (!this._children) return this;
            var list = [];
            for (var i in this._children) list.push(this._children[i]);
            var t = this;
            list.forEach(function (o) { t.removeChildren(o); });
            return this;
        };
        //���ط���
        return function (classRef) {
            classRef.prototype.append = append;
            classRef.prototype.removeChildren = removeChildren;
            classRef.prototype.removeAllChildren = removeAllChildren;
        };
    })();

    //�½�����
    v.createShapeType = (function () {
        var _idCount = 0;
        var t = function () {
            this._id = ++_idCount;
        };
        cls.copy(t.prototype, shapeObj.prototype);
        //�Ƴ�
        t.prototype.remove = function () {
            if (this._parent) this._parent.removeChildren(this);
            return this;
        };
        //��ӵ�
        t.prototype.appendTo = function (par) {
            par.append(this);
            return this;
        };
        //�½�����
        return function (name, attrs, asgroup) {
            //��������
            var ref = function (prop) {
                t.call(this);
                for (var i in prop) {
                    this[i](prop[i]);
                }
            };
            cls.copy(ref.prototype, t.prototype);
            if (asgroup) asGroup(ref);
            //�������ͷ���
            if (attrs) for (var i in attrs) {
                cls.createMethod(ref, i, attrs[i], ref.prototype.triggerChanged);
            }
            //��������
            ref.prototype.name = function () {
                return name;
            };
            //�õ���ǰ����ֵ
            ref.prototype.values = function () {
                return cls.copy({}, shapeObjProperties, shapeObjFeilds, attrs, this._properties);
            };
            //���ع�������
            v[name] = function (prop) {
                return new ref(prop);
            };
        };
    })();

    //����ö��
    v.fontWeight = {
        normal: 'normal',
        bold: 'bold',
        bolder: 'bolder',
        lighter: 'lighter'
    };
    v.fontStyle = {
        normal: 'normal',
        italic: 'italic',
        oblique: 'oblique'
    };
    v.fontVariant = {
        normal: 'normal',
        smallCaps: 'small-caps',
        'small-caps': 'small-caps'
    };
    v.textBaseline = {
        top: "top",
        bottom: "bottom",
        middle: "middle",
        alphabetic: "alphabetic",
        hanging: "hanging",
        ideographic: "ideographic"
    };
    v.textAlign = {
        start: "start",
        end: "end",
        center: "center",
        left: "left",
        right: "right"
    };

    //���õ�����
    //�߿�����
    var _fills = {
        fill: null,
        strokeWidth: 0,
        lineCap: "round",
        lineJoin: "round",
        miterLimit: 0,
        stroke: null
    };

    //�߶�
    v.createShapeType('line', cls.copy({
        x1: 0, y1: 0,
        x2: 0, y2: 0
    }, _fills));

    //·��
    v.createShapeType('path', cls.copy({
        path: null
    }, _fills));
    //Բ��
    v.createShapeType('circle', cls.copy({
        cx: 0,
        cy: 0,
        r: 0
    }, _fills));
    //����
    v.createShapeType('rect', cls.copy({
        x: 0,
        y: 0,
        width: 0,
        height: 0
    }, _fills));
    //�����
    v.createShapeType('polygon', cls.copy({
        path: null,
        close: false
    }, _fills));
    //ͼƬ
    v.createShapeType('image', {
        src: null,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        clipw: 0,
        cliph: 0,
        cx: 0,
        cy: 0
    });

    //���
    v.createShapeType('group', null, true);

    //����
    v.createShapeType("text", cls.copy({
        text: null,
        fontSize: null,
        fontWeight: null,
        fontStyle: null,
        fontFamily: null,
        lineHeight: null,
        fontVariant: null,
        textAlign: null,
        textBaseline: null,
        width: null
    }, _fills));


    //zIndex����
    var sortedChildren = function () {
        this._l = [];
        this._c = {};
    };
    sortedChildren.prototype.append = function (o, i) {
        var oi = i || o.zIndex();
        var a = this._c[oi];
        if (!a) {
            a = { i: oi, l: [] };
            this._c[oi] = a;
            this._l.push(a);
            this._l.sort(function (a, b) { return a.i - b.i; });
        }
        a.l.push(o);
    };
    sortedChildren.prototype.remove = function (o, i) {
        var oi = i || o.zIndex();
        var a = this._c[oi];
        if (!a) return;
        var ix = a.l.indexOf(o);
        if (ix >= 0) {
            a.l.splice(ix, 1);
            if (!a.l.length) {
                delete this._c[oi];
                ix = this._l.indexOf(a);
                if (ix >= 0) this._l.splice(ix, 1);
            }
        }
    };
    sortedChildren.prototype.each = function (callback, e) {
        for (var i = 0; i < this._l.length; ++i) {
            var l = this._l[i].l;
            for (var j = 0; j < l.length; ++j) callback(l[j], e);
        }
    };

    //��ʱ��ʵ��
    var make_timer = (function () {
        var aframe = cls.or(window, 'r,webkitR,msR,mozR'.split(','), 'equestAnimationFrame');
        var cframe = cls.or(window, 'c,webkitC,msC,mozC'.split(','), 'ancelAnimationFrame') || clearInterval;
        //aframe = null;
        //cframe = clearInterval;
        //�Զ�ˢ��
        var _startTimer = function () {
            if (this._killTimer) return;

            //*
            //ʹ�ö�ý�嶨ʱ��
            var timer, that = this;
            var ticker = function () {
                if (!that._killTimer) return;
                if (that._killTimer) {
                    that._objectNumber = 0;
                    if (that._ticker) that._ticker(); //����ˢ��
                }
                if (aframe) timer = aframe(ticker);
            };
            if (!aframe) timer = setInterval(ticker);
            this._killTimer = function () {
                if (timer) cframe(timer);
                this._killTimer = undefined;
            };
            //������_killTimer�������
            ticker();
        };
        //֪ͨ�ϲ�仯
        var triggerChanged = function () {
            this._ischanged = true;
            this._killNumber = 0;
            this._startTimer();
        };

        return function (t) {
            t.prototype.triggerChanged = triggerChanged;
            t.prototype._startTimer = _startTimer;
        }
    })();

    //����ʵ��
    v.stage = (function () {
        //���ݸ����¼�
        var _zChanged = function (v) {
            var p = this._parent._sortedChs;
            p.remove(this);
            p.append(this, v);
        };
        //ɾ����ʾ
        var _removeSorted = function (o) {
            o.off("zIndex", _zChanged);
            o.off("appendChild", _appendChild);
            o.off("remove", _remove);

            if (o._children) {
                if (o._sortedChs) delete o._sortedChs;
                for (var i in o._children) _removeSorted(o._children[i]);
            }
        };
        var _remove = function () {
            var p = this._parent._sortedChs;
            if (p) p.remove(this);
            _removeSorted(this);
        };
        //�����ʾ
        var _appendChild = function (o) {
            var p = o._parent;
            if (!p._sortedChs) p._sortedChs = new sortedChildren();
            p._sortedChs.append(o);

            o.on("zIndex", _zChanged);
            o.on("appendChild", _appendChild);
            o.on("remove", _remove);

            var e = o._children;
            if (!e) return;
            for (var i in e) _appendChild(e[i]);
        };
        //canvas��Ĺ��캯��
        var t = function () {
            var ele = document.createElement('canvas');
            this._canvas = ele.getContext('2d');
            this._element = ele;
            this._killNumber = 0;

            //�����ʾ
            this.on("appendChild", _appendChild);
        };
        cls.createEventSupport(t);
        asGroup(t);
        //��ӵ�div
        t.prototype.appendTo = function (par) {
            if (par.append) par.append(this._element);
            else par.appendChild(this._element);
            return this;
        };
        //�������������
        //todo��֧�ֽ�������ͼƬ���
        var _strokeJ = function (ctx, prop) {
            var sw = prop.strokeWidth(), s = prop.stroke();
            if (sw && s) {
                var cap = prop.lineCap();
                var join = prop.lineJoin();
                var miter = prop.miterLimit() || 0;
                if (cap && cap != ctx.lineCap) ctx.lineCap = cap;
                if (join && join != ctx.lineJoin) ctx.lineJoin = join;
                if (miter != ctx.miterLimit) ctx.miterLimit = miter;
                if (sw != ctx.lineWidth) ctx.lineWidth = sw;
                if (s != ctx.strokeStyle) ctx.strokeStyle = s;
                return true;
            }
            return false;
        };
        var _fillJ = function (ctx, prop) {
            var f = prop.fill();
            if (f) {
                if (f != ctx.fillStyle) ctx.fillStyle = f;
                return true;
            }
            return false;
        };
        var _strokeFill = function (ctx, prop) {
            if (_fillJ(ctx, prop)) ctx.fill();
            if (_strokeJ(ctx, prop)) ctx.stroke();
        };
        //����
        var draw = {
            //��������
            line: function (ctx, prop) {
                ctx.beginPath();
                ctx.moveTo(prop.x1(), prop.y1());
                ctx.lineTo(prop.x2(), prop.y2());
                _strokeFill(ctx, prop);
            },
            //·��
            path: (function () {
                //path����
                var pathDef = {
                    M: 2,
                    L: 2,
                    C: 6,
                    S: 6,
                    Q: 4,
                    T: 4,
                    A: 5,
                    Z: 0
                };

                var canvasPathDef = {
                    M: 'moveTo',
                    L: "lineTo",
                    C: 'bezierCurveTo',
                    S: 'bezierCurveTo',
                    Q: 'quadraticCurveTo',
                    T: 'quadraticCurveTo',
                    A: 'arcTo',
                    Z: 'closePath'
                };

                //·������,todo:��û�д���HV���û�д���Сд��ĸ
                function canvasPath(str) {
                    var com = [];
                    if (!str) return com;
                    var idx = 0;
                    var readCmd = function () {
                        while (idx < str.length) {
                            var cmd = str.charCodeAt(idx);
                            if ((cmd >= 65 && cmd <= 90) || (cmd >= 97 && cmd <= 122)) {
                                var scmd = str.charAt(idx);
                                ++idx;
                                return scmd;
                            }
                            ++idx;
                        }
                    };
                    var readNumber = function () {
                        var num = "";
                        while (idx < str.length) {
                            var cmd = str.charCodeAt(idx);
                            if ((cmd >= 45 && cmd <= 46) || (cmd >= 48 && cmd <= 57)) {
                                num += str.charAt(idx);
                            } else if (num) {
                                return parseFloat(num);
                            }
                            ++idx;
                        }
                    };
                    while (true) {
                        var cmd = readCmd();
                        if (!cmd) break;
                        var ucmd = cmd.toUpperCase();

                        if (ucmd != cmd) throw new Error("�����ܴ���Сд");

                        //������
                        var sf = canvasPathDef[ucmd];
                        if (!sf) throw new Error("δ֪�����" + cmd);

                        //�����б�
                        var len = pathDef[ucmd];
                        var ps = [];
                        for (var i = 0; i < len; ++i) {
                            ps.push(readNumber());
                        }

                        //����
                        com.push([sf, ps]);
                    }

                    return com;
                }

                return function (ctx, prop) {
                    ctx.beginPath();
                    var p = prop.path();
                    if (!prop._cache || prop._cache.path != p) {
                        prop._cache = {
                            path: p,
                            commands: canvasPath(p)
                        };
                    }
                    var cm = prop._cache.commands;
                    for (var i = 0; i < cm.length; ++i) {
                        ctx[cm[i][0]].apply(ctx, cm[i][1]);
                    }
                    _strokeFill(ctx, prop);
                };
            })(),
            //Բ��
            circle: function (ctx, prop) {
                ctx.beginPath();
                ctx.arc(prop.cx(), prop.cy(), prop.r(), 0, Math.PI, false);
                ctx.arc(prop.cx(), prop.cy(), prop.r(), Math.PI, Math.PI * 2, false);
                _strokeFill(ctx, prop);
            },
            //����
            rect: function (ctx, prop) {
                ctx.beginPath();
                ctx.moveTo(prop.x(), prop.y());
                ctx.lineTo(prop.x() + prop.width(), prop.y());
                ctx.lineTo(prop.x() + prop.width(), prop.y() + prop.height());
                ctx.lineTo(prop.x(), prop.y() + prop.height());
                ctx.closePath();
                _strokeFill(ctx, prop);
            },
            //�����
            polygon: function (ctx, prop) {
                var p = prop.path();
                    console.log(p);
                if (!p || p.length < 4) return;
                ctx.beginPath();
                ctx.moveTo(p[0], p[1]);
                for (var i = 3; i < p.length; i += 2) {
                    ctx.lineTo(p[i - 1], p[i]);
                }
                if (prop.close()) ctx.closePath();
                _strokeFill(ctx, prop);
            },
            //ͼƬ
            image: function (ctx, prop) {
                var img;
                if (!prop._cache || prop._cache.src != prop.src()) {
                    if (typeof prop.src() == 'string') {
                        img = new Image();
                        img.src = prop.src();
                    } else img = prop.src(); //֧��ֱ�ӳ���ͼƬ
                    prop._cache = {
                        src: prop.src(),
                        image: img
                    };
                } else img = prop._cache.image;
                var w = prop.width();
                var h = prop.height();
                var cw = prop.clipw(), ch = prop.cliph();
                if (w && h) try {

                    if (cw || ch) {
                        ctx.drawImage(img, prop.cx(), prop.cy(), cw, ch, prop.x(), prop.y(), w, h);
                    } else {
                        ctx.drawImage(img, prop.x(), prop.y(), w, h);
                    }
                } catch (e) { }
                else try {
                    if (cw || ch) {
                        ctx.drawImage(img, prop.cx(), prop.cy(), cw, ch, prop.x(), prop.y());
                    } else {
                        ctx.drawImage(img, prop.x(), prop.y());
                    }
                } catch (e) { }
            },
            //���
            group: function (ctx, prop) {
                prop._sortedChs && prop._sortedChs.each(function (oi, e) { e._drawItem(ctx, oi); }, this);
            },
            //����
            text: function (ctx, prop) {
                if (!prop.text()) return;

                //ƴ��������ʽ
                var s = '';
                var tmp = prop.fontStyle();
                if (tmp && (tmp in v.fontStyle)) s += tmp + " ";

                tmp = prop.fontVariant();
                if (tmp && (tmp in v.fontVariant)) s += tmp + " ";

                tmp = prop.fontWeight();
                if (tmp && (tmp in v.fontWeight)) s += tmp + " ";

                var fsize = (prop.fontSize() || 10);
                if (typeof fsize === "number") fsize += "px";
                s += fsize;


                var lh = prop.lineHeight();
                if (lh) {
                    if (typeof lh === "number") lh += "px";
                    s += "/" + lh;
                }

                tmp = (prop.fontFamily() || 'Arial');
                if (/[^a-zA-Z0-9]/.test(tmp)) tmp = "'" + tmp + "'";
                s += " " + tmp;

                ctx.font = s;
                ctx.textAlign = prop.textAlign();
                ctx.textBaseline = prop.textBaseline();

                if (!prop.width()) {
                    var metrics = ctx.measureText(prop.text());
                    prop.width(metrics.width);
                }
                if (_strokeJ(ctx, prop)) {
                    if (prop.width()) ctx.strokeText(prop.text(), 0, 0, prop.width());
                    else ctx.strokeText(prop.text(), 0, 0);
                }
                if (_fillJ(ctx, prop)) {
                    if (prop.width()) ctx.fillText(prop.text(), 0, 0, prop.width());
                    else ctx.fillText(prop.text(), 0, 0);
                }
            }
        };
        //���Ż��ƺ�����������չ
        t.draws = draw;
        //���ƶ���
        t.prototype._drawItem = function (ctx, prop) {
            var opt = prop.opacity();
            if (opt == 0) return;

            var tr = prop._hasTransform;
            var sh = prop.shadowColor() && prop.shadowBlur();
            if (tr || sh) ctx.save();
            var preOpt;
            if (tr) {
                //matrix
                ctx.transform(prop.scaleX(),
					prop.skewY() && Math.tan(prop.skewY() * Math.PI / 180),
					prop.skewX() && Math.tan(prop.skewX() * Math.PI / 180),
					prop.scaleY(),
					prop.left(),
					prop.top());
                prop.rotate() && ctx.rotate(prop.rotate() / 180 * Math.PI);
                if (prop.matrix()) {
                    ctx.transform.apply(ctx, prop.matrix());
                }
                preOpt = ctx.globalAlpha;
                if (opt < 1) ctx.globalAlpha *= opt;
            }
            if (sh) {
                ctx.shadowColor = prop.shadowColor();
                ctx.shadowOffsetX = prop.shadowOffsetX();
                ctx.shadowOffsetY = prop.shadowOffsetY();
                ctx.shadowBlur = prop.shadowBlur();
            }

            var cpo;
            if (prop.compositeOperation()) {
                cpo = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = prop.compositeOperation();
            }
            //todo��check unsurported types
            draw[prop.name()].call(this, ctx, prop);

            if (tr || sh) ctx.restore();
            if (tr && opt < 1) ctx.globalAlpha = preOpt;
            if (cpo) ctx.globalCompositeOperation = cpo;

            prop._ischanged = false;
        };
        //�������
        t.prototype._draw = function (force) {
            if (!force && !this._ischanged) {
                return;
                /*
                if (this._killNumber > 60) {
                    if (this._killTimer) this._killTimer();
                }
                else ++this._killNumber;
                */
                return;
            }
            this._ischanged = false;

            this._canvas.clearRect(0, 0, this._element.width, this._element.height);
            this._sortedChs && this._sortedChs.each(function (oi, e) { e._drawItem(e._canvas, oi); }, this);
        };
        //���ô�С
        t.prototype.resize = function (w, h) {
            this._element.width = w;
            this._element.height = h;
            this._draw(true);
            return this;
        };
        //ˢ��
        t.prototype._ticker = function () {
            this._draw();
        };
        make_timer(t);
        //������Դ
        t.prototype.load = function (urls, progress) {
            if (!urls || !urls.length) {
                if (progress) progress(0, 0);
            }
            var loadedCount = 0;
            var loaded = function () {
                ++loadedCount;
                if (progress) progress(urls.length, loadedCount, this);
            };
            if (!this._resourceMap) this._resourceMap = {};
            for (var i = 0; i < urls.length; ++i) {
                if (!urls[i]) return loaded();
                var img = new Image();
                this._resourceMap[urls[i]] = img;
                img.onload = loaded;
                img.onabort = loaded;
                img.onerror = loaded;
                img.src = urls[i];
            }
        };
        return function () {
            return new t();
        };
    })();

    return v;
})();;
