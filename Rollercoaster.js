import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Curve extends Shape {
    // curve_function: (t) => vec3
    constructor(curve_function, sample_count, curve_color=color( 1, 0, 0, 1 )) {
        super("position", "normal");

        this.material = { shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color }
        this.sample_count = sample_count;

        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = i / this.sample_count;
                this.arrays.position.push(curve_function(t));
                this.arrays.normal.push(vec3(0, 0, 0)); // have to add normal to make Phong shader work.
            }
        }
    }

    draw(webgl_manager, uniforms) {
        // call super with "LINE_STRIP" mode
        super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
    }

    update(webgl_manager, uniforms, curve_function) {
        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = 1.0 * i / this.sample_count;
                this.arrays.position[i] = curve_function(t);
            }
        }
        // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
        this.copy_onto_graphics_card(webgl_manager.context);
        // Note: vertex count is not changed.
        // not tested if possible to change the vertex count.
    }
};

export class Spline {
    constructor() {
        this.points = [];
        this.tangents = [];
        this.sample_size = 0;
    }

    add_point(x, y, z, tx, ty, tz){
        this.points.push(vec3(x, y, z));
        this.tangents.push(vec3(tx, ty, tz));
        this.sample_size += 1;
    }

    get_position(t){
        if (this.sample_size < 2){
            return vec3(0, 0, 0)
        }

        const a = Math.floor(t*(this.sample_size - 1));
        const b = Math.ceil(t*(this.sample_size - 1));
        const s = (t * (this.sample_size - 1)) % 1.0;

        let P_0 = this.points[a].copy();
        let v_0 = this.tangents[a].copy();
        let P_1 = this.points[b].copy();
        let v_1 = this.tangents[b].copy();

        let coeff_1 = (2 * s*s*s) - (3 * s*s) + 1;
        let coeff_2 = (s*s*s) - (2 * s*s) + s;
        let coeff_3 = (-2 * s*s*s) + (3 * s*s);
        let coeff_4 = (s*s*s) - (s*s);
        let scaler = 1 / (this.sample_size - 1);
        return P_0.times(coeff_1).plus(v_0.times(coeff_2*scaler).plus(P_1.times(coeff_3).plus(v_1.times(coeff_4*scaler))));
    }

    get_points(){
        return this.points;
    }

    get_size(){
        return this.sample_size;
    }
};

export class Rollercoaster{
    constructor() {
        this.spline = new Spline();
        this.spline_left = new Spline();
        this.spline_right = new Spline();
        this.main_ride_sample_size = 500;
        this.stage = 0;
        this.curve = null;
        this.curve_left = null;
        this.curve_right = null;
        this.spline_t = 0;
        this.car = new Shape_From_File('./assets/bumper_cars/bumper_car.obj');
    }

    add_rollercoaster(){
        //Initializing rollercoaster points
        //Rise to gain PE
        this.spline.add_point(15.0, 2.0, -25.0, 0.0, 0.0, 0.0);
        this.spline.add_point(14.5, 2.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(14.0, 3.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(13.5, 3.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(13.0, 4.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(12.5, 4.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(12.0, 5.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(11.5, 5.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(11.0, 6.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(10.5, 6.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(10.0, 7.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(9.5, 7.5, -25.0,  -15.0, 15.0, 0.0);
        this.spline.add_point(9.0, 8.0, -25.0,  -15.0, 15.0, 0.0);
        this.spline.add_point(8.5, 8.5, -25.0,  -15.0, 15.0, 0.0);
        this.spline.add_point(8.0, 9.0, -25.0,  -15.0, 15.0, 0.0);
        this.spline.add_point(7.5, 9.5, -25.0,  -15.0, 15.0, 0.0);
        this.spline.add_point(7.0, 10.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(6.5, 10.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(6.0, 11.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(5.5, 11.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(5.0, 12.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(4.5, 12.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(4.0, 13.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(3.5, 13.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(3.0, 14.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(2.5, 14.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(2.0, 15.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(1.5, 15.5, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(1.0, 16.0, -25.0, -15.0, 15.0, 0.0);
        this.spline.add_point(0.0, 16.6, -25.0, -50.0, -20.0, 0.0);

        //Rollercoaster part starts
        this.spline.add_point(-0.5,15.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-1.0, 14.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-1.5, 13.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-2.0, 12.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-2.5, 11.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-3.0, 10.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-3.5, 9.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-4.0, 8.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-4.5, 7.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-5.0, 6.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-5.5, 5.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-6.0, 4.5, -25.0, -20.0, -20.0, 0.0);
        this.spline.add_point(-6.5, 3.5, -25.0, -20, -20.0, 0.0);
        this.spline.add_point(-7.0, 2.5, -25.0, -100.0, -100.0, -500.0);
        this.spline.add_point(-7.0, 2.0, -35.0, 500, 0.0, 0.0);
        this.spline.add_point(0.0, 2.0, -35.0, 500.0, 0.0, 0.0);
        this.spline.add_point(7.0, 10.0, -37.0, 0.0, 700.0, 0.0);
        this.spline.add_point(0.0, 20.0, -39.0, -700.0, 0.0, 0.0);
        this.spline.add_point(-7.0, 10.0, -41.0, 0.0, -700.0, 0.0);
        this.spline.add_point(0.0, 2.0, -41.0, 700.0, 0.0, 0.0);
        this.spline.add_point(5.0, 2.0, -41.0, 30.0, 0.0, 0.0);
        this.spline.add_point(10.0, 2.0, -41.0, 30.0, 0.0, 0.0);
        this.spline.add_point(15.0, 2.0, -41.0, 100.0, 0.0, 200.0);
        this.spline.add_point(15.0, 2.0, -25.0, -500.0, 200.0, 0.0);

        // Left Track
        this.spline_left.add_point(15.0, 2.0, -24.5, 0.0, 0.0, 0.0);
        this.spline_left.add_point(14.5, 2.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(14.0, 3.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(13.5, 3.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(13.0, 4.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(12.5, 4.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(12.0, 5.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(11.5, 5.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(11.0, 6.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(10.5, 6.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(10.0, 7.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(9.5, 7.5, -24.5,  -15.0, 15.0, 0.0);
        this.spline_left.add_point(9.0, 8.0, -24.5,  -15.0, 15.0, 0.0);
        this.spline_left.add_point(8.5, 8.5, -24.5,  -15.0, 15.0, 0.0);
        this.spline_left.add_point(8.0, 9.0, -24.5,  -15.0, 15.0, 0.0);
        this.spline_left.add_point(7.5, 9.5, -24.5,  -15.0, 15.0, 0.0);
        this.spline_left.add_point(7.0, 10.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(6.5, 10.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(6.0, 11.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(5.5, 11.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(5.0, 12.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(4.5, 12.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(4.0, 13.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(3.5, 13.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(3.0, 14.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(2.5, 14.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(2.0, 15.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(1.5, 15.5, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(1.0, 16.0, -24.5, -15.0, 15.0, 0.0);
        this.spline_left.add_point(0.0, 16.6, -24.5, -50.0, -20.0, 0.0);
        this.spline_left.add_point(-0.5,15.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-1.0, 14.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-1.5, 13.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-2.0, 12.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-2.5, 11.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-3.0, 10.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-3.5, 9.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-4.0, 8.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-4.5, 7.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-5.0, 6.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-5.5, 5.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-6.0, 4.5, -24.5, -20.0, -20.0, 0.0);
        this.spline_left.add_point(-6.5, 3.5, -24.5, -20, -20.0, 0.0);
        this.spline_left.add_point(-7.0, 2.5, -24.5, -100.0, -100.0, -500.0);
        this.spline_left.add_point(-7.0, 2.0, -34.5, 500, 0.0, 0.0);
        this.spline_left.add_point(0.0, 2.0, -34.5, 500.0, 0.0, 0.0);
        this.spline_left.add_point(7.0, 10.0, -36.5, 0.0, 700.0, 0.0);
        this.spline_left.add_point(0.0, 20.0, -38.5, -700.0, 0.0, 0.0);
        this.spline_left.add_point(-7.0, 10.0, -40.5, 0.0, -700.0, 0.0);
        this.spline_left.add_point(0.0, 2.0, -40.5, 700.0, 0.0, 0.0);
        this.spline_left.add_point(5.0, 2.0, -40.5, 30.0, 0.0, 0.0);
        this.spline_left.add_point(10.0, 2.0, -40.5, 30.0, 0.0, 0.0);
        this.spline_left.add_point(15.0, 2.0, -40.5, 100.0, 0.0, 200.0);
        this.spline_left.add_point(15.0, 2.0, -24.5, -500.0, 200.0, 0.0);

        // Right Track
        this.spline_right.add_point(15.0, 2.0, -25.5, 0.0, 0.0, 0.0);
        this.spline_right.add_point(14.5, 2.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(14.0, 3.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(13.5, 3.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(13.0, 4.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(12.5, 4.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(12.0, 5.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(11.5, 5.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(11.0, 6.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(10.5, 6.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(10.0, 7.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(9.5, 7.5, -25.5,  -15.0, 15.0, 0.0);
        this.spline_right.add_point(9.0, 8.0, -25.5,  -15.0, 15.0, 0.0);
        this.spline_right.add_point(8.5, 8.5, -25.5,  -15.0, 15.0, 0.0);
        this.spline_right.add_point(8.0, 9.0, -25.5,  -15.0, 15.0, 0.0);
        this.spline_right.add_point(7.5, 9.5, -25.5,  -15.0, 15.0, 0.0);
        this.spline_right.add_point(7.0, 10.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(6.5, 10.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(6.0, 11.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(5.5, 11.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(5.0, 12.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(4.5, 12.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(4.0, 13.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(3.5, 13.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(3.0, 14.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(2.5, 14.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(2.0, 15.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(1.5, 15.5, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(1.0, 16.0, -25.5, -15.0, 15.0, 0.0);
        this.spline_right.add_point(0.0, 16.6, -25.5, -50.0, -20.0, 0.0);
        this.spline_right.add_point(-0.5,15.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-1.0, 14.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-1.5, 13.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-2.0, 12.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-2.5, 11.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-3.0, 10.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-3.5, 9.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-4.0, 8.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-4.5, 7.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-5.0, 6.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-5.5, 5.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-6.0, 4.5, -25.5, -20.0, -20.0, 0.0);
        this.spline_right.add_point(-6.5, 3.5, -25.5, -20, -20.0, 0.0);
        this.spline_right.add_point(-7.0, 2.5, -25.5, -100.0, -100.0, -500.0);
        this.spline_right.add_point(-7.0, 2.0, -35.5, 500, 0.0, 0.0);
        this.spline_right.add_point(0.0, 2.0, -35.5, 500.0, 0.0, 0.0);
        this.spline_right.add_point(7.0, 10.0, -37.5, 0.0, 700.0, 0.0);
        this.spline_right.add_point(0.0, 20.0, -39.5, -700.0, 0.0, 0.0);
        this.spline_right.add_point(-7.0, 10.0, -41.5, 0.0, -700.0, 0.0);
        this.spline_right.add_point(0.0, 2.0, -41.5, 700.0, 0.0, 0.0);
        this.spline_right.add_point(5.0, 2.0, -41.5, 30.0, 0.0, 0.0);
        this.spline_right.add_point(10.0, 2.0, -41.5, 30.0, 0.0, 0.0);
        this.spline_right.add_point(15.0, 2.0, -41.5, 100.0, 0.0, 200.0);
        this.spline_right.add_point(15.0, 2.0, -25.5, -500.0, 200.0, 0.0);
        //Initializing tracks
        const curve = (t) => this.spline.get_position(t);
        this.curve = new Curve(curve, 1000);
        const curve_left = (t) => this.spline_left.get_position(t);
        this.curve_left = new Curve(curve_left, 1000);
        const curve_right = (t) => this.spline_right.get_position(t);
        this.curve_right = new Curve(curve_right, 1000);
    }

    draw_track(caller, uniforms, materials, shapes){
        this.curve.draw(caller, uniforms);
        this.curve_left.draw(caller, uniforms);
        this.curve_right.draw(caller, uniforms);

        let points_right = this.spline_right.get_points();
        let points_left = this.spline_left.get_points();

        for (let i = 0; i < this.spline_left.get_size(); i++){
            const p1 = points_left[i];
            const p2 = points_right[i];
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);
            let model_transform = Mat4.scale(0.05, len/2, 0.05);
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1){
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len/2);
            }
            const w = v.cross(p).normalized();
            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(caller, uniforms, model_transform, { ...materials.metal, color:color(1, 0, 0, 1)})
        }
    }

    draw_stands(caller, uniforms, materials, shapes){
        let points_left = [vec3(15.0, 2.0, -24.5), vec3(14.0, 3.0, -24.5), vec3(13.0, 4.0, -24.5), vec3(12.0, 5.0, -24.5),
            vec3(11.0, 6.0, -24.5), vec3(10.0, 7.0, -24.5), vec3(9.0, 8.0, -24.5), vec3(8.0, 9.0, -24.5), vec3(7.0, 10.0, -24.5),
            vec3(6.0, 11.0, -24.5), vec3(5.0, 12.0, -24.5), vec3(4.0, 13.0, -24.5), vec3(3.0, 14.0, -24.5), vec3(2.0, 15.0, -24.5),
            vec3(1.0, 16.0, -24.5), vec3(0.0, 16.6, -25.5), vec3(-0.5,15.5, -24.5), vec3(-1.5, 13.5, -24.5), vec3(-2.5, 11.5, -24.5), vec3(-3.5, 9.5, -24.5),
            vec3(-4.5, 7.5, -24.5), vec3(-5.5, 5.5, -24.5), vec3(-6.5, 3.5, -24.5), vec3(-7.0, 2.5, -24.5), vec3(-7.0, 2.0, -34.5),
            vec3(0.0, 2.0, -34.5), vec3(0.0, 2.0, -40.5), vec3(5.0, 2.0, -40.5), vec3(10.0, 2.0, -40.5), vec3(15.0, 2.0, -40.5)];

        for (let i = 0; i < 30; i++){
            const p1 = points_left[i];
            const p2 = vec3(points_left[i][0], 0.0, points_left[i][2]);
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);
            let model_transform = Mat4.scale(0.05, len/2, 0.05);
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1){
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len/2);
            }
            const w = v.cross(p).normalized();
            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(caller, uniforms, model_transform, { ...materials.metal, color:color(1, 0, 0, 1)})
        }

        points_left = [vec3(7.0, 10.0, -36.5), vec3(-7.0, 10.0, -40.5)];
        let points_right = [vec3(15.0, 0.0, -36.5), vec3(-15.0, 0.0, -40.5)];

        for (let i = 0; i < 2; i++){
            const p1 = points_left[i];
            const p2 = points_right[i];
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);
            let model_transform = Mat4.scale(0.05, len/2, 0.05);
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1){
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len/2);
            }
            const w = v.cross(p).normalized();
            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(caller, uniforms, model_transform, { ...materials.metal, color:color(1, 0, 0, 1)})
        }

        //Right side
        points_left = [vec3(15.0, 2.0, -25.5), vec3(14.0, 3.0, -25.5), vec3(13.0, 4.0, -25.5), vec3(12.0, 5.0, -25.5),
            vec3(11.0, 6.0, -25.5), vec3(10.0, 7.0, -25.5), vec3(9.0, 8.0, -25.5), vec3(8.0, 9.0, -25.5), vec3(7.0, 10.0, -25.5),
            vec3(6.0, 11.0, -25.5), vec3(5.0, 12.0, -25.5), vec3(4.0, 13.0, -25.5), vec3(3.0, 14.0, -25.5), vec3(2.0, 15.0, -25.5),
            vec3(1.0, 16.0, -25.5), vec3(0.0, 16.6, -25.5), vec3(-0.5,15.5, -25.5), vec3(-1.5, 13.5, -25.5), vec3(-2.5, 11.5, -25.5), vec3(-3.5, 9.5, -25.5),
            vec3(-4.5, 7.5, -25.5), vec3(-5.5, 5.5, -25.5), vec3(-6.5, 3.5, -25.5), vec3(-7.0, 2.5, -25.5), vec3(-7.0, 2.0, -35.5),
            vec3(0.0, 2.0, -35.5), vec3(0.0, 2.0, -41.5), vec3(5.0, 2.0, -41.5), vec3(10.0, 2.0, -41.5), vec3(15.0, 2.0, -41.5)];

        for (let i = 0; i < 30; i++){
            const p1 = points_left[i];
            const p2 = vec3(points_left[i][0], 0.0, points_left[i][2]);
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);
            let model_transform = Mat4.scale(0.05, len/2, 0.05);
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1){
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len/2);
            }
            const w = v.cross(p).normalized();
            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(caller, uniforms, model_transform, { ...materials.metal, color:color(1, 0, 0, 1)})
        }

        points_left = [vec3(7.0, 10.0, -37.5), vec3(-7.0, 10.0, -41.5)];
        points_right = [vec3(15.0, 0.0, -37.5), vec3(-15.0, 0.0, -41.5)];

        for (let i = 0; i < 2; i++){
            const p1 = points_left[i];
            const p2 = points_right[i];
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);
            let model_transform = Mat4.scale(0.05, len/2, 0.05);
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1){
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len/2);
            }
            const w = v.cross(p).normalized();
            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(caller, uniforms, model_transform, { ...materials.metal, color:color(1, 0, 0, 1)})
        }
    }

    draw_coaster(caller, uniforms, materials){
        if(this.stage === 0){
            this.main_ride_sample_size = 800;
        }
        if(this.stage === 1){
            this.main_ride_sample_size -= 1;
        }

        if(this.stage === 3){
            this.main_ride_sample_size += 50;
        }
        let spline_position = this.spline.get_position(this.spline_t);
        this.spline_t += 1/this.main_ride_sample_size;

        // console.log("Spline position: ", spline_position);
        if(spline_position[1] > 16.0 && spline_position[0] <= 0.0 && this.stage === 0){
            this.main_ride_sample_size = 200;
            this.stage = 1;
        }

        if(spline_position[0] < -6.8 && spline_position[1] < 2.7 && this.stage === 1){
            this.main_ride_sample_size = 500;
            this.stage = 2;
        }

        if(spline_position[0] > 5.0 && spline_position[1] === 2.0 && spline_position[2] === -41.0 && this.stage === 2){
            this.main_ride_sample_size += 50;
            this.stage = 3;
        }

        if(spline_position[0] === 15.0 && spline_position[1] === 2.0 && spline_position[2] > -26.0 && this.stage === 3){
            this.main_ride_sample_size = 800;
            this.stage = 0;
        }

        if(this.spline_t > 1.0){
            this.spline_t = 0;
        }


        // this.spline.add_point(5.0, 2.0, -41.0, 30.0, 0.0, 0.0);
        // this.spline.add_point(10.0, 2.0, -41.0, 30.0, 0.0, 0.0);
        // this.spline.add_point(15.0, 2.0, -41.0, 100.0, 0.0, 200.0);
        // this.spline.add_point(15.0, 2.0, -25.0, -500.0, 200.0, 0.0);

        // let point1 = this.spline.get_position(Math.pow(Math.sin(this.t_sim / 5),2));
        let model_transform = Mat4.identity().pre_multiply(Mat4.translation(spline_position[0], spline_position[1], spline_position[2]));
        model_transform = model_transform.times(Mat4.scale(.5, .5, .5));
        model_transform = model_transform.times(Mat4.translation(0, 1, 0));
        this.car.draw( caller, uniforms, model_transform, { ...materials.plastic, color: color(0, 0, 1, 1)} );
    }

    draw(caller, uniforms, materials, shapes){
        this.draw_track(caller, uniforms, materials, shapes);
        this.draw_coaster(caller, uniforms, materials);
        this.draw_stands(caller, uniforms, materials, shapes);
    }
};