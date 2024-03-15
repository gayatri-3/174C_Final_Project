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
            //shapes.box.draw( webgl_manager, uniform, model_transform, { ...materials.plastic, color: blue } );

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
    constructor(particleColor, springColor, springScaleFactor, particleScaleFactor) {
        this.particles = [];
        this.springs = [];
        this.g_acc = 0;
        this.ground_ks = 0;
        this.ground_kd = 0;
        this.particleColor = particleColor;
        this.springColor = springColor;
        this.springScaleFactor = springScaleFactor;
        this.particleScaleFactor = particleScaleFactor;
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

    draw(webgl_manager, uniform, shapes, materials, translationMatrix) {
        const swayMagnitude = 0.1; // Adjust this value to control the maximum distance the leaves sway

        for(const p of this.particles) {
            const pos = p.pos;

            // Generate random offsets for swaying
            const swayOffset = vec3(
                Math.random() * swayMagnitude - swayMagnitude / 2, // Random offset along x-axis
                Math.random() * swayMagnitude - swayMagnitude / 2, // Random offset along y-axis
                Math.random() * swayMagnitude - swayMagnitude / 2  // Random offset along z-axis
            );

            // Apply the offsets to the leaf positions
            const finalPos = pos.plus(swayOffset);

            let model_transform = Mat4.identity().pre_multiply(Mat4.translation(finalPos[0], finalPos[1], finalPos[2]));
            model_transform = model_transform.times(translationMatrix);
            // Scale the branches
            model_transform = model_transform.times(Mat4.scale(this.particleScaleFactor, this.particleScaleFactor, this.particleScaleFactor));

            shapes.ball.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: this.particleColor});
        }

        for(const s of this.springs) {
            const p1 = s.particle_1.pos;
            const p2 = s.particle_2.pos;
            const len = (p2.minus(p1)).norm();
            const center = (p1.plus(p2)).times(0.5);

            let model_transform = Mat4.identity().pre_multiply(Mat4.translation(center[0], center[1], center[2])); // Apply translation first
            model_transform = model_transform.times(translationMatrix);

            // Apply rotation (if needed)
            const p = p1.minus(p2).normalized();
            let v = vec3(0, 1, 0);
            if(Math.abs(v.cross(p).norm()) < 0.1) {
                v = vec3(0, 0, 1);
                model_transform = model_transform.times(Mat4.scale(0.05 * this.springScaleFactor, 0.05 * this.springScaleFactor, len / 2));
            }

            const w = v.cross(p).normalized();

            const theta = Math.acos(v.dot(p));
            model_transform = model_transform.times(Mat4.rotation(theta, w[0], w[1], w[2]));

            // Apply scaling
            model_transform = model_transform.times(Mat4.scale(0.05 * this.springScaleFactor, len / 2, 0.05 * this.springScaleFactor));

            shapes.box.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: this.springColor});
        }
    }
}

export class TreeDrawer {
    constructor(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, translationMatrix) {
        this.levels = levels;
        this.branchLength = branchLength;
        this.branchColor = branchColor;
        this.leafColor = leafColor;
        this.branchScaleFactor = branchScaleFactor;
        this.leafScaleFactor = leafScaleFactor;
        this.translationMatrix = translationMatrix;

        this.particles = [];
        this.springs = [];

        this.createTree();

        // Initialize the simulation object
        this.simulation = new Particle_Simulation(leafColor, branchColor, branchScaleFactor, leafScaleFactor);
        this.simulation.particles = this.particles;
        this.simulation.springs = this.springs;
        this.simulation.g_acc = 0.1;  // Adjust as needed
        this.simulation.ground_ks = 0.2;
        this.simulation.ground_kd = 0.1;
    }

    createTree() {
        // Create the root particle
        const rootParticle = new Particle();
        rootParticle.pos = vec3(0, 0, 0);
        this.particles.push(rootParticle);

        // Create the trunk (main branch)
        const trunkDirection = vec3(0, 1, 0);
        this.createBranch(rootParticle, trunkDirection, this.levels, true); // Set true to indicate it's the trunk
    }

    createBranch(parentParticle, direction, levels, isTrunk = false) {
        let branchLength = this.branchLength;

        if (isTrunk) {
            // Adjust the trunk length
            branchLength *= 2; // Or any factor you prefer for the trunk length compared to other branches
        }

        if (levels <= 0) {
            // Create a leaf particle
            const leafParticle = new Particle();
            leafParticle.pos = parentParticle.pos.plus(direction.times(branchLength));
            this.particles.push(leafParticle);

            // Create a spring between parent and leaf
            const spring = new Spring();
            spring.particle_1 = parentParticle;
            spring.particle_2 = leafParticle;
            spring.ks = 0.5;  // You can adjust these values
            spring.kd = 0.1;
            spring.rest_length = branchLength;
            this.springs.push(spring);
        } else {
            // Create a branch particle
            const branchParticle = new Particle();
            branchParticle.pos = parentParticle.pos.plus(direction.times(branchLength));
            this.particles.push(branchParticle);

            // Create a spring between parent and branch
            const spring = new Spring();
            spring.particle_1 = parentParticle;
            spring.particle_2 = branchParticle;
            spring.ks = 0.5;  // You can adjust these values
            spring.kd = 0.1;
            spring.rest_length = branchLength;
            this.springs.push(spring);

            // Recursively create sub-branches
            const numSubBranches = Math.floor(Math.random() * 3) + 3; // Generate 3 to 6 sub-branches
            for (let i = 0; i < numSubBranches; i++) {
                const newDirection = vec3(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1).normalized();
                this.createBranch(branchParticle, newDirection, levels - 1);
            }
        }
    }

    update(dt) {
        // Update the simulation
        const simulation = new Particle_Simulation();
        simulation.particles = this.particles;
        simulation.springs = this.springs;
        simulation.g_acc = 0.1;  // Gravity acceleration, adjust as needed
        simulation.ground_ks = 0.2;  // Ground spring constant
        simulation.ground_kd = 0.1;  // Ground damping constant
        simulation.update(dt);
    }

    draw(webgl_manager, uniform, shapes, materials) {
        this.simulation.draw(webgl_manager, uniform, shapes, materials, this.translationMatrix);


        let model_transform = Mat4.identity().times(this.translationMatrix);
        model_transform = model_transform.times(Mat4.translation(0, this.branchLength, 0));
        model_transform = model_transform.times(Mat4.scale(this.branchScaleFactor, this.branchLength, this.branchScaleFactor));
        shapes.box.draw(webgl_manager, uniform, model_transform, {...materials.plastic, color: this.branchColor});


    }
}

export class Firework {
    constructor(position, velocity, color) {
        this.position = position;
        this.velocity = velocity;
        this.color = color;
    }
}

export class FireworksDisplay {
    constructor(numFireworks, canvasWidth, canvasHeight) {
        this.numFireworks = numFireworks;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.fireworks = [];

        // Initialize fireworks
        for (let i = 0; i < this.numFireworks; i++) {
            const fireworks = this.createFirework();
            this.fireworks.push(fireworks);
        }
    }

    createFirework() {
        // Example: Randomly generate color
        const randomColor = color(Math.random(), Math.random(), Math.random(), 1.0);

        // Create a firework with random color
        const fireworks = new Firework(
            vec3(Math.random() * this.canvasWidth, Math.random() * this.canvasHeight, 0),
            vec3(0, 0, 0), // Initial velocity
            randomColor // Set color
        );

        return fireworks;
    }

    update(dt) {
        // Update fireworks position, velocity, etc.
        const gravity = vec3(0, -9.81, 0); // Example gravity vector (adjust as needed)

        for (const fireworks of this.fireworks) {
            // Apply gravity to the velocity
            fireworks.velocity = fireworks.velocity.plus(gravity.times(dt));

            // Update position based on velocity
            fireworks.position = fireworks.position.plus(fireworks.velocity.times(dt));
        }
    }

    draw(webgl_manager, uniform, shapes, materials) {
        // Draw fireworks
        for (const fireworks of this.fireworks) {
            // Example: Draw a particle at fireworks position with specified color
            shapes.ball.draw(webgl_manager, uniform, Mat4.translation(...fireworks.position), {
                ...materials.plastic,
                color: fireworks.color
            });
        }
    }
}