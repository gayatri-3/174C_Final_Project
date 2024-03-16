import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Curve_Shape extends Shape {
    constructor(curve_function, sample_count, curve_color = color(0, 0, 1, 1)) {
        super("position", "normal");

        this.material = {shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color}
        this.sample_count = sample_count;

        if(curve_function && this.sample_count) {
            for(let i = 0; i < this.sample_count + 1; i++) {
                let t = i / this.sample_count;
                this.arrays.position.push(curve_function(t));
                this.arrays.normal.push(vec3(0, 0, 0));
            }
        }
    }

    draw(webgl_manager, uniforms) {
        super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
    }
}

export class BezierCurve {
    constructor() {
        this.points = [];
        this.tangents = [];
        this.size = 0;
    }

    add_point(x, y, z) {
        this.points.push(vec3(x, y, z));
        this.size += 1;
    }

    get_position(t) {

        if(this.size < 4) {
            return vec3(0, 0, 0);
        }
        const s = (t * (this.size - 1)) % 1.0;

        let a = this.points[0].copy();
        let b = this.points[1].copy();
        let c = this.points[2].copy();
        let d = this.points[3].copy();

        return a.times(this.h0(s)).plus(b.times(this.h1(s))).plus(c.times(this.h2(s))).plus(d.times(this.h3(s)));
    }

    h0(t) {
        return Math.pow(1 - t, 3);
    }

    h1(t) {
        return 3 * Math.pow(1 - t, 2) * t;
    }

    h2(t) {
        return 3 * (1 - t) * Math.pow(t, 2);
    }

    h3(t) {
        return Math.pow(t, 3);
    }
}

export class Fountain {
    constructor() {
        this.fountain = [];
        this.curves = [];
        this.numStreams = 8;
        this.numDrops = 10;
        this.drops = [];
    }

    init() {
        for(let i = 0; i < this.numStreams; i++) {
            let baseX = -25;
            let baseY = 2;
            let baseZ = 0;
            let yscale = 3;
            let xscale = 1;
            let zscale = 1;
            if(i >= this.numStreams/2) {
                yscale *= (i % this.numStreams/2);
                xscale *= (i % this.numStreams/2);
                zscale *= (i % this.numStreams/2);
            } else {
                yscale *= i;
                xscale *= i;
                zscale *= i;
            }
            if(i % 2 == 1) {
                xscale *= -1;
                zscale *= -1;
            }
            this.fountain[i] = new BezierCurve();
            this.fountain[i].add_point(baseX, baseY, baseZ);
            this.fountain[i].add_point(baseX - 2*xscale, baseY + 1 + yscale, baseZ + zscale);
            this.fountain[i].add_point(baseX - xscale, baseY + 2 + 2*yscale, baseZ + zscale);
            this.fountain[i].add_point(baseX + xscale, baseY + yscale, baseZ);

            let curve_fn = (t) => this.fountain[i].get_position(t);
            this.curves[i] = new Curve_Shape(curve_fn, 1000);

            let drop = [];
            for(let j = 0; j < this.numDrops; j++) {
                drop[j] = new Drop(baseX, baseY, baseZ);
            }
            this.drops[i] = drop;
        }
    }

    update(t, dt) {
        for(let i = 0; i < this.numStreams; i++) {
            for(let j = 0; j < this.numDrops; j++) {
                t = t - (j/this.numDrops);
                if(t < 0) t = 0;
                // console.log("i: " + i + ", j: " + j + ", t: " + t);
                this.drops[i][j].update(this.fountain[i].get_position(t), dt);
            }
        }
    }

    draw(webgl_manager, uniform, shapes, materials) {
        // for(let i = 0; i < this.numStreams; i++) {
        //     this.curves[i].draw(webgl_manager, uniform);
        // }

        const blue = color(0, 0, 1, 1);
        const red = color(1, 0, 0, 1);

        for (let i = 0; i < this.numStreams; i++) {
            for(let j = 0; j < this.numDrops; j++) {
                const pos = this.drops[i][j].pos;
                let model_transform = Mat4.scale(0.1, 0.1, 0.1);
                model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
                shapes.ball.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: blue});
            }
        }
    }
}

export class Drop {
    constructor(x, y, z) {
        this.mass = 0;
        this.pos = vec3(x, y, z);
        this.vel = vec3(0, 0, 0);
        this.acc = vec3(0, 0, 0);
        this.ext_force = vec3(0, 0, 0);
    }

    update(p, dt) {
        this.vel = p.minus(this.pos).times(1/dt);
        this.pos = p;
    }
}
