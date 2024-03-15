import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;
export class Curve_Shape extends Shape {
    constructor(curve_function, sample_count, curve_color = color(1, 0, 0, 1)) {
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

export class Spline {
    constructor() {
        this.points = [];
        this.tangents = [];
        this.size = 0;
    }

    add_point(x, y, z, tx, ty, tz) {
        this.points.push(vec3(x, y, z));
        this.tangents.push(vec3(tx, ty, tz));
        this.size += 1;
    }

    get_size() {
        return this.size;
    }

    get_points(){
        return this.points;
    }
    get_position(t) {

        const A = Math.floor(t * (this.size - 1));
        const B = Math.ceil(t * (this.size - 1));
        const s = (t * (this.size - 1)) % 1.0;
        let scalar = 1/(this.size - 1);

        let pa = this.points[A].copy();
        let ma = this.tangents[A].copy();
        let pb = this.points[B].copy();
        let mb = this.tangents[B].copy();

        let first = pa.times(this.h00(s));
        let second = ma.times(this.h01(s)).times(scalar);
        let third = pb.times(this.h10(s));
        let fourth = mb.times(this.h11(s)).times(scalar);


        return first.plus(second).plus(third).plus(fourth);
    }

    h00(t) {
        return 2*Math.pow(t, 3) - 3*Math.pow(t, 2) + 1;
    }

    h01(t) {
        return Math.pow(t, 3) - 2*Math.pow(t, 2) + t;
    }

    h10(t) {
        return -2*Math.pow(t, 3) + 3*Math.pow(t, 2);
    }

    h11(t) {
        return Math.pow(t, 3) - Math.pow(t, 2);
    }

    get_arc_length() {
        let length = 0;
        let sample_cnt = 1000;

        let prev = this.get_position(0);
        for (let i = 1; i < sample_cnt + 1; i++) {
            const t = i / sample_cnt;
            const curr = this.get_position(t);
            length += curr.minus(prev).norm();
            prev = curr;
        }

        return length;
    }
}

export class Particle {
    constructor() {
        this.mass = 0;
        this.pos = vec3(0, 0, 0);
        this.vel = vec3(0, 0, 0);
        this.acc = vec3(0, 0, 0);
        this.ext_force = vec3(0, 0, 0);
    }

    update(dt) {
        //uses symplectic euler updating
        this.acc = this.ext_force.times(1 / (this.mass));
        this.vel = this.vel.plus(this.acc.times(dt));
        this.pos = this.pos.plus(this.vel.times(dt));
    }

}

export class Spring {
    constructor() {
        this.particle_1 = null;
        this.particle_2 = null;
        this.ks = 0;
        this.kd = 0;
        this.rest_length = 0;
    }

    update() {

        const fe_ij = this.calculate_viscoelastic_force();

        this.particle_1.ext_force.add_by(fe_ij);
        this.particle_2.ext_force.subtract_by(fe_ij);
    }

    calculate_viscoelastic_force() {
        // let d_ij = this.particle_1.pos.minus(this.particle_2.pos);
        // let v_ij = this.particle_1.vel.minus(this.particle_2.vel);
        let d_ij = this.particle_2.pos.minus(this.particle_1.pos);
        let v_ij = this.particle_2.vel.minus(this.particle_1.vel);
        let d = d_ij.norm();
        d_ij.normalized();
        let fs_ij = d_ij.times(this.ks*(d - this.rest_length));

        let fd_ij = d_ij.times(d_ij.dot(v_ij) * -1 * this.kd);

        return fs_ij.plus(fd_ij);
    }
}

export class Simulation {
    constructor() {
        this.particles = [];
        this.springs = [];
        this.g_acc = 0;
        this.ground_ks = 0;
        this.ground_kd = 0;
    }

    update(dt, point1) {

        let first = true;

        for(const p of this.particles) {
            if(first) {
                first = false;
            }
            else {
                p.ext_force = this.g_acc.times(p.mass);
                this.calculate_ground_forces(p);
            }
        }

        for(const s of this.springs) {
            s.update();
        }

        first = true;
        for(const p of this.particles) {
            if(first) {
                first = false;
                p.vel = point1.minus(p.pos).times(1/dt);
                p.pos = point1;
            }
            else {
                p.update(dt);
            }
        }

    }

    calculate_ground_forces(p) {
        let pg = vec3(0, 0, 0);
        let n = vec3(0, 1, 0);
        let left = n.times(n.dot(pg.minus(p.pos))).times(this.ground_ks);
        let right = n.times(n.dot(p.vel)).times(this.ground_kd);
        p.ext_force = p.ext_force.plus(left.minus(right));
    }

    draw(webgl_manager, uniform, shapes, materials) {
        const blue = color(0, 0, 1, 1);
        const red = color( 1, 0, 0, 1);

        for(const p of this.particles) {
            const pos = p.pos;
            // let model_transform = Mat4.scale(0.2, 0.2, 0.2);
            // model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
            //shapes.ball.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: blue});
            let model_transform = Mat4.identity().pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
            model_transform = model_transform.times(Mat4.scale(.5, .5, .5));
            model_transform = model_transform.times(Mat4.translation(0, 1, 0));
            shapes.box.draw( webgl_manager, uniform, model_transform, { ...materials.plastic, color: blue } );

        }

        for(const s of this.springs) {
            const p1 = s.particle_1.pos;
            const p2 = s.particle_2.pos;
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);

            let model_transform = Mat4.scale(0.05, len / 2, 0.05);

            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1) {
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len / 2);
            }

            const w = v.cross(p).normalized();

            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: red});
        }
    }
}


export class Particle_Simulation {
    constructor() {
        this.particles = [];
        this.springs = [];
        this.g_acc = 0;
        this.ground_ks = 0;
        this.ground_kd = 0;
    }

    update(dt, point1) {

        let first = true;

        for(const p of this.particles) {
            if(first) {
                first = false;
            }
            else {
                p.ext_force = this.g_acc.times(p.mass);
                this.calculate_ground_forces(p);
            }
        }

        for(const s of this.springs) {
            s.update();
        }

        first = true;
        for(const p of this.particles) {
            if(first) {
                first = false;
                p.vel = point1.minus(p.pos).times(1/dt);
                p.pos = point1;
            }
            else {
                p.update(dt);
            }
        }

    }

    calculate_ground_forces(p) {
        let pg = vec3(0, 0, 0);
        let n = vec3(0, 1, 0);
        let left = n.times(n.dot(pg.minus(p.pos))).times(this.ground_ks);
        let right = n.times(n.dot(p.vel)).times(this.ground_kd);
        p.ext_force = p.ext_force.plus(left.minus(right));
    }

    draw(webgl_manager, uniform, shapes, materials) {
        const blue = color(0, 0, 1, 1);
        const red = color( 1, 0, 0, 1);

        for(const p of this.particles) {
            const pos = p.pos;
            let model_transform = Mat4.identity().pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
/*
            let body_model_transform = model_transform.times(Mat4.translation(0, 1, 0));
            body_model_transform = body_model_transform.times(Mat4.scale(.5, .5, .5));

            let head_model_transform = model_transform.times(Mat4.translation(0, 1.75, 0));
            head_model_transform = head_model_transform.times(Mat4.scale(.3, .3, .3));

            let left_hand = model_transform.times(Mat4.translation(0.25, 1.25, 0.5));
            left_hand = left_hand.times(Mat4.scale(0.2, 0.2, 0.2));

            let right_hand = left_hand.times(Mat4.translation(0, 0, -4.5));
*/
            shapes.ball.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: blue});
/*
            const white = color(1, 1, 1, 1);
            shapes.ball.draw(webgl_manager, uniform, body_model_transform, {...materials.plastic, color: white});
            shapes.ball.draw(webgl_manager, uniform, head_model_transform, {...materials.plastic, color: blue});

            shapes.ball.draw(webgl_manager, uniform, left_hand, {...materials.plastic, color: blue})
            shapes.ball.draw(webgl_manager, uniform, right_hand, {...materials.plastic, color: blue});
*/
        }

        for(const s of this.springs) {
            const p1 = s.particle_1.pos;
            const p2 = s.particle_2.pos;
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);

            let model_transform = Mat4.scale(0.05, len / 2, 0.05);

            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1) {
                v = vec3(0, 0, 1);
                model_transform = Mat4.scale(0.05, 0.05, len / 2);
            }

            const w = v.cross(p).normalized();

            const theta = Math.acos(v.dot(p));
            model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
            model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
            shapes.box.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: red});
        }
    }
}

export class TreeDrawer {
    constructor(levels, branchLength, leafRadius) {
        this.levels = levels;
        this.branchLength = branchLength;
        this.leafRadius = leafRadius;

        this.particles = [];
        this.springs = [];

        this.createTree();
    }

    createTree() {
        // Create the root particle
        const rootParticle = new Particle();
        rootParticle.pos = vec3(0, 0, 0);
        this.particles.push(rootParticle);

        // Recursively create branches and leaves
        this.createBranch(rootParticle, vec3(0, 1, 0), this.levels);
    }

    createBranch(parentParticle, direction, levels) {
        if (levels <= 0) {
            // Create a leaf particle
            const leafParticle = new Particle();
            leafParticle.pos = parentParticle.pos.plus(direction.times(this.branchLength));
            this.particles.push(leafParticle);

            // Create a spring between parent and leaf
            const spring = new Spring();
            spring.particle_1 = parentParticle;
            spring.particle_2 = leafParticle;
            spring.ks = 0.5;  // You can adjust these values
            spring.kd = 0.1;
            spring.rest_length = this.branchLength;
            this.springs.push(spring);
        } else {
            // Create a branch particle
            const branchParticle = new Particle();
            branchParticle.pos = parentParticle.pos.plus(direction.times(this.branchLength));
            this.particles.push(branchParticle);

            // Create a spring between parent and branch
            const spring = new Spring();
            spring.particle_1 = parentParticle;
            spring.particle_2 = branchParticle;
            spring.ks = 0.5;  // You can adjust these values
            spring.kd = 0.1;
            spring.rest_length = this.branchLength;
            this.springs.push(spring);

            // Recursively create sub-branches
            const newDirection1 = vec3(0.5, Math.random(), 0.5).normalized();
            const newDirection2 = vec3(-0.5, Math.random(), 0.5).normalized();
            this.createBranch(branchParticle, newDirection1, levels - 1);
            this.createBranch(branchParticle, newDirection2, levels - 1);
        }
    }

    update(dt) {
        // Update the simulation
        const simulation = new Simulation();
        simulation.particles = this.particles;
        simulation.springs = this.springs;
        simulation.g_acc = 0.1;  // Gravity acceleration, adjust as needed
        simulation.ground_ks = 0.2;  // Ground spring constant
        simulation.ground_kd = 0.1;  // Ground damping constant
        simulation.update(dt);
    }

    draw(webgl_manager, uniform, shapes, materials) {
        // Draw particles and springs
        const simulation = new Particle_Simulation();
        simulation.particles = this.particles;
        simulation.springs = this.springs;
        simulation.g_acc = 0.1;
        simulation.ground_ks = 0.2;
        simulation.ground_kd = 0.1;
        simulation.draw(webgl_manager, uniform, shapes, materials);
    }
}
