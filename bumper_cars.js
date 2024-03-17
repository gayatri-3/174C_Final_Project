import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
import { Articulated_Human } from './human.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

import {BezierCurve, Fountain} from "./fountain.js";
import {Rollercoaster} from "./Rollercoaster.js";
import {Curve_Shape, Spline, Particle, Spring, Simulation, Particle_Simulation, TreeDrawer, FireworksDisplay, CarnivalStand} from "./SplineCurve.js";

let lastTimestamp = performance.now() / 1000;



const Car = class Car{
  constructor(x, y, z, vx = 0, vy = 0, vz = 0){
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.wx = 0;
    this.wy = 0;
    this.wz = 0;

    this.mass = 1;

    this.x_dim = 2.8;
    this.y_dim = 2.8;
    this.z_dim = 2.8;
    
    this.car = new Shape_From_File('./assets/bumper_cars/bumper_car.obj');
    this.material = { shader: new defs.Phong_Shader, ambient: .2, diffusivity: 1, specularity: .5, color: color( .3, .3, .3, 1 ) }
  }

  transform(context, program_state, transform){
    let car_transform = transform.times(Mat4.translation(this.x, this.y, this.z)).times(Mat4.rotation(this.wy, 0, 1, 0));
    this.car.draw(context, program_state, car_transform, this.material);
  }

  draw(context, program_state){
    let car_transform = Mat4.identity();
    car_transform = car_transform.times(Mat4.translation(this.x, this.y, this.z));
    this.car.draw(context, program_state, car_transform, this.material);
  }

  update_pos(vi, a){
      this.x = this.x + (vi/60.0) + (1/120)*a ;
  }

  update_velocity(vx = this.vx, vy = this.vy, vz = this.vz){
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
  }

  update_rot(wx = this.wx, wy = this.wy, wz = this.wz){
    this.wx = wx;
    this.wy = wy;
    this.wz = wz;
  }
  has_collided(obj2){
    let collisionX = Math.abs(this.x - obj2.x) < 2 * ((this.x_dim) + (obj2.x_dim));
    let collisionY = Math.abs(this.y - obj2.y) < 2* ((this.y_dim) + (obj2.y_dim));
    let collisionZ = Math.abs(this.z - obj2.z) < 2 * ((this.z_dim) + (obj2.z_dim));
    return collisionX && collisionY && collisionZ;
  }

  calculate_collision(obj2){
    let v1 = [((this.mass - obj2.mass)*this.vx + (2 * obj2.mass * obj2.vx) / (this.mass + obj2.mass)), 
              ((this.mass - obj2.mass)*this.vy + (2 * obj2.mass * obj2.vy) / (this.mass + obj2.mass)), 
              ((this.mass - obj2.mass)*this.vz + (2 * obj2.mass * obj2.vz) / (this.mass + obj2.mass)), ]
    let v2 = [((obj2.mass - this.mass)*obj2.vx + (2 * this.mass * this.vx) / (this.mass + obj2.mass)), 
              ((obj2.mass - this.mass)*obj2.vy + (2 * this.mass * this.vy) / (this.mass + obj2.mass)), 
              ((obj2.mass - this.mass)*obj2.vz + (2 * this.mass * this.vz) / (this.mass + obj2.mass)), ]
    return [v1, v2];
  }
}
export
const Bumper_cars_base = defs.Bumper_cars_base =
    class Bumper_cars_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
                                               // exposes only the display() method, which actually places and draws the shapes,
                                               // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(),
           'sky': new defs.Subdivision_Sphere(4),
          'fence' : new Shape_From_File("./assets/fence/fence.obj"),
          'human': new Articulated_Human(),
          'cylinder' : new defs.Rounded_Capped_Cylinder(50, 32, [[0, 10], [0, 5]]),
          'cone' : new defs.Rounded_Closed_Cone(20, 4, [[0, 10], [0, 5]])
        };

        this.curve_fn = null;
        this.sample_cnt = 0;
        this.curve = new Curve_Shape(null, 100);

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const basic = new defs.Basic_Shader();
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.bumper_car_floor = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .64,.64,.64,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }
        this.materials.sky = {shader: tex_phong, ambient: 1, texture: new Texture("assets/sky.png")}
        this.materials.carnival_stand_bottom = {shader: tex_phong, ambient: 1, texture: new Texture("assets/red_white_stripes.jpg")}
        //this.materials.sky = {shader: tex_phong, ambient: 1, texture: new Texture("assets/sky_cartoon.png")}
        this.materials.ground = {shader: tex_phong, ambient: 1, texture: new Texture("assets/grass_1.jpg")}
        this.materials.flesh   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  0, color: color( .9,.5,.9,1 ) }
        //this.materials.ground = {shader: tex_phong, ambient: 1, texture: new Texture("assets/grass_cartoon.png")}
        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        //Fountain
        this.fountain = new Fountain();
        this.fountain.init();

        // Rollercoaster Instance
        this.rollercoaster = new Rollercoaster();
        this.rollercoaster.add_rollercoaster();

        this.sample_cnt = 1000;
        this.t_step = 0.01;
        this.t_sim = 0;
        this.step_t = 0.001;
        this.sim_t = 0;
/*
        const curve_fn = (t) => this.spline.get_position(t);
        this.curve = new Curve_Shape(curve_fn, this.sample_cnt);

        const curve_left = (t) => this.spline_left.get_position(t);
        this.curve_left = new Curve_Shape(curve_left, this.sample_cnt);

        const curve_right = (t) => this.spline_right.get_position(t);
        this.curve_right = new Curve_Shape(curve_right, this.sample_cnt);

        this.sim = new Simulation();
        const num = 1;
        let y_val = 8;
        for(let i = 0; i < num; i++) {
          let particle = new Particle();
          particle.mass = 1.0;
          particle.pos = vec3(2, y_val-i, 0);
          particle.vel = vec3(0, 0, 0);
          this.sim.particles.push(particle);
        }

<<<<<<< HEAD
        this.sim_t = 0;
        this.step_t = 0.001;

=======
*/

        // for(let i = 0; i < num -1; i++) {
        //   let spring = new Spring();
        //   spring.particle_1 = this.sim.particles[i];
        //   spring.particle_2 = this.sim.particles[i+1];
        //   spring.ks = 5;
        //   spring.kd = 0.1;
        //   spring.rest_length = 1;
        //   this.sim.springs.push(spring);
        // }
/*
        this.sim.ground_ks = 5000;
        this.sim.ground_kd = 1;
        this.sim.g_acc = vec3(0, -9.8, 0);
*/
        // BUMPER CAR INIT
        this.starting_rot_ang = 1/50;
        this.car1 = new Car(-10, 0, 1);
        this.car2 = new Car(10, 0, 0);
        this.velocities = this.car1.calculate_collision(this.car2);
        this.velocitized = false;
        this.collided = false;
        this.hit_wall = false;

        //particle system simulation init
        //this.particle_simulation = new Particle_Simulation();
/*
        let n = 5;
        for(let i = 0; i < n; i++) {
          let particle = new Particle();
          particle.mass = 1.0;
          particle.pos = vec3(-7, 0, (3*i) + 4);
          particle.vel = vec3(0, 0, 0);
          this.particle_simulation.particles.push(particle);
        }
*/
        //tree init
        const branchColor = [0.5, 0.35, 0.05, 1]; // Brown
        const leafColor = [0.0, 0.8, 0.0, 1]; // Green
        const levels = 4;
        const branchLength = 2;
        const branchScaleFactor = 0.5; // Adjust the branch scaling factor
        const leafScaleFactor = 1; // Adjust the leaf scaling factor
        const treeTranslation = Mat4.translation(-5, -1, 5);
        this.tree = new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, treeTranslation);

        //fireworks init
        this.fireworks_animation = false;
        this.fireworks_animation_counter = 0;
        // for some reason cannot change these values
        //this.fireworks = new FireworksDisplay(10, 10, 10, 2);

        // carnival init
        this.carnival_stand = new CarnivalStand();

        // animatronic
        this.spline = new Spline();
        this.spline.add_point(-8, 25.0, 62.15, 2, 0.0, 0.0);
        this.spline.add_point(-6, 15.0, 62.15, -2, 0.0, 0.0);
        this.spline.add_point(-8, 25.0, 62.15, -2, 0.0, 0.0);

        // comment
        this.spline2 = new Spline();
        this.spline2.add_point(5, 25.0, 62.15, -2, 0.0, 0.0);
        this.spline2.add_point(5, 15.0, 62.15, 2, 0.0, 0.0);
        this.spline2.add_point(5, 25.0, 62.15, 4, 0.0, 0.0);

        const curve_fn = (t) => this.spline.get_position(t);
        const curve_fn2 = (t) => this.spline2.get_position(t);
        this.sample_cnt = 1000;
        this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
        this.curve2 = new Curve_Shape(curve_fn2, this.sample_cnt2);

        this.human = new Articulated_Human;
        this.right_target_pos = vec3(-4.5, 12.0, 32.15);
        this.left_target_pos = vec3(2.5, 12.0, 32.15);
        this.left_target_pos = vec3(2.5, 4.0, 32.15);
      }

      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Part_one_hermite, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
          // matrix follows the usual format for transforms, but with opposite values (cameras exist as
          // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
          // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
          // orthographic() automatically generate valid matrices for one.  The input arguments of
          // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

          // !!! Camera changed here
          Shader.assign_camera( Mat4.look_at (vec3 (25, 25, 25), vec3 (10, 15, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        let t = this.t = this.uniforms.animation_time/1000;
        //const angle = Math.sin( t );
        const angle = Math.sin( 0 );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20 * Math.cos(angle), 20,  20 * Math.sin(angle), 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        // this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
        let sky_transform = Mat4.identity().times(Mat4.scale(50,50,50));
        this.shapes.sky.draw(caller, this.uniforms, sky_transform, this.materials.sky);
        let floor_transform = Mat4.identity().times(Mat4.scale(50, 0.01, 50));
        this.shapes.box.draw(caller, this.uniforms, floor_transform, this.materials.ground);

        // bumper car scenery
        let bumper_floor_transform = Mat4.identity().times(Mat4.translation(-1, 0.1, -6)).times(Mat4.scale(8, 0.01, 8));
        this.shapes.box.draw(caller, this.uniforms, bumper_floor_transform, this.materials.bumper_car_floor);
        let fence1_transform = Mat4.identity().times(Mat4.translation(-1, 0, 2)).times(Mat4.scale(4.5, 5, 5));
        this.shapes.fence.draw(caller, this.uniforms, fence1_transform, this.materials.bumper_car_floor);
        let fence2_transform = Mat4.identity().times(Mat4.translation(-1, 0, -14)).times(Mat4.scale(4.5, 5, 5));
        this.shapes.fence.draw(caller, this.uniforms, fence2_transform, this.materials.bumper_car_floor);
        let fence3_transform = Mat4.identity().times(Mat4.translation(7, 0, -6)).times(Mat4.scale(4.5, 5, 4.5)).times(Mat4.rotation(83.25, 0, 1, 0));
        this.shapes.fence.draw(caller, this.uniforms, fence3_transform, this.materials.bumper_car_floor);
        let fence4_transform = Mat4.identity().times(Mat4.translation(-9, 0, -6)).times(Mat4.scale(4.5, 5, 4.5)).times(Mat4.rotation(83.25, 0, 1, 0));
        this.shapes.fence.draw(caller, this.uniforms, fence4_transform, this.materials.bumper_car_floor);
      }
    }


export class Bumper_cars extends Bumper_cars_base
{                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.

  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to
    // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
    // different matrix value to control where the shape appears.

    // Variables that are in scope for you to use:
    // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
    // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
    // this.materials.metal:    Selects a shader and draws with a shiny surface.
    // this.materials.plastic:  Selects a shader and draws a more matte surface.
    // this.lights:  A pre-made collection of Light objects.
    // this.hover:  A boolean variable that changes when the user presses a button.
    // shared_uniforms:  Information the shader needs for drawing.  Pass to draw().
    // caller:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

    // Call the setup code that we left inside the base class:
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
        // From here on down it's just some example shapes drawn for you -- freely
        // replace them with your own!  Notice the usage of the Mat4 functions
        // translation(), scale(), and rotation() to generate matrices, and the
        // function times(), which generates products of matrices.

    const blue = color( 0,0,1,1 ), yellow = color( 1,0.7,0,1 ), red = color( 1,0,1.0,1.0, 1), flesh = color(1, 0.79, 0.64, 1);

    let t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    //Fountain with water drops
    this.fountain.draw(caller, this.uniforms, this.shapes, this.materials);

    let dt = 1/60;
    dt = Math.min(1/30, dt);
    let t_next = this.sim_t + dt;
    while(this.sim_t < t_next) {
      this.fountain.update(this.sim_t, dt);
      this.sim_t += this.step_t;
    }

    // // !!! Draw ball (for reference)
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //     .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );
    // add some fluctuation

    // TODO: you should draw spline here.
    //Rollercoaster
    this.rollercoaster.draw(caller, this.uniforms, this.materials, this.shapes);

    let carnival_stand_transform = Mat4.identity();
    this.carnival_stand.draw(caller, this.uniforms, this.shapes, carnival_stand_transform, this.materials);

    // draw particle system
    //this.particle_simulation.draw(caller, this.uniforms, this.shapes, this.materials);

//    this.particle_simulation.draw(caller, this.uniforms, this.shapes, this.materials);
    //this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );
//    console.log(this.particle_simulation);


    /*
    let dt = 1/60;
    dt = Math.min(1/30, dt);

    let t_next = this.t_sim + dt;
    while(this.t_sim < t_next) {
      let point1 = this.spline.get_position(Math.pow(Math.sin(this.t_sim / 5),2));
      this.sim.update(this.t_step, point1);
      //this.particle_simulation.update(t_step);
      // console.log(point1);
      this.t_sim += this.t_step;
    }
*/
    // BUMPER CARS!!!!
    let friction = 1/10000;
    let translational_friction = 1/100;
    let bumper_car_transform = Mat4.rotation(-90, 0, 1, 0).times(Mat4.translation(0,0.5,0));
    // this.shapes.box.draw(caller, this.uniforms, bumper_car_transform, {...this.materials.metal, color: red});
    this.car1.transform(caller, this.uniforms, bumper_car_transform);
    let bumper_car2_transform = Mat4.rotation(90, 0, 1, 0).times(Mat4.translation(0, 0.5, 0));
    this.car2.transform(caller, this.uniforms, bumper_car2_transform);
    if (this.car1.has_collided(this.car2)){
      this.collided = true;
    }
    if (!this.collided){
      if (this.car1.x < 10){
        this.car1.update_pos(5, 0);
        this.car1.update_velocity(5, 0, 0);
      }
      if (this.car2.x > -10){
        this.car2.update_pos(-5, 0);
        this.car2.update_velocity(-5, 0, 0);
      }
    }
    // rotation case
    else if (!this.hit_wall){
      if (!this.velocitized){
        this.velocities = this.car1.calculate_collision(this.car2);
        this.velocitized = true;
      }
      if (Math.abs(this.velocities[0][0]) > 0 && this.starting_rot_ang > 0){
        this.car1.update_pos(this.velocities[0][0], -1);
        this.car2.update_pos(this.velocities[1][0], 1);
        this.velocities[0][0] += translational_friction;
        this.velocities[1][0] -= translational_friction;
      }
      if (this.starting_rot_ang > 0){
        this.car1.update_rot(this.car1.wx, this.car1.wy + this.starting_rot_ang, this.car1.wz);
        this.car2.update_rot(this.car2.wx, this.car2.wy - this.starting_rot_ang, this.car2.wz);
      }
      this.starting_rot_ang -= friction;
    }
    if (this.car1.x < -14)
      this.hit_wall  = true;
    if (this.hit_wall && this.car1.vx > 0){
      this.starting_rot_ang = 1/50;
      this.car1.update_pos(this.car1.vx, 0);
      this.car2.update_pos(this.car2.vx, 0);
      this.car1.update_rot(this.car1.wx, this.car1.wy + this.starting_rot_ang, this.car1.wz);
      this.car2.update_rot(this.car2.wx, this.car2.wy - this.starting_rot_ang, this.car2.wz);
      this.car1.vx -= 3 * translational_friction;
      this.car2.vx += 3 * translational_friction;
    }
    // console.log("Collision?: " + this.car1.has_collided(this.car2));

    //draw tree
    this.tree.draw(caller, this.uniforms, this.shapes, this.materials);

    // draw fireworks when button pressed
    if (this.fireworks_animation === true) {
      //draw fireworks
      const currentTime = performance.now() / 1000; // Convert to seconds
      const dt = currentTime - lastTimestamp;
      lastTimestamp = currentTime;
      this.fireworks.update(dt);
      this.fireworks.draw(caller, this.uniforms, this.shapes, this.materials);
      let sky_transform = Mat4.identity().times(Mat4.scale(49,49,49));
      this.shapes.ball.draw(caller, this.uniforms, sky_transform, {...this.materials.plastic, color: color(0,0,0.2,1)});
      this.fireworks_animation_counter++;
    }
    if(this.fireworks_animation_counter > 500){
      this.fireworks_animation = false;
      this.fireworks_animation_counter = 0;
    }
    console.log(this.fireworks_animation_counter);

    // animatronic
    let lu_leg_transform = Mat4.scale(0.4, 1.6, .6);
    lu_leg_transform.pre_multiply(Mat4.translation(-4.2, 5, 35));
    this.shapes.ball.draw(caller, this.uniforms, lu_leg_transform, { ...this.materials.flesh, color : flesh});
    let ll_leg_transform = Mat4.scale(0.4, 2, .2);
    ll_leg_transform.pre_multiply(Mat4.translation(-4.2, 1.8, 35));
    this.shapes.ball.draw(caller, this.uniforms, ll_leg_transform, { ...this.materials.flesh, color : flesh});
    let ru_leg_transform = Mat4.scale(0.4, 1.6, .6);
    ru_leg_transform.pre_multiply(Mat4.translation(-1.8, 5, 35));
    this.shapes.ball.draw(caller, this.uniforms, ru_leg_transform, { ...this.materials.flesh, color : flesh});
    let rl_leg_transform = Mat4.scale(0.4, 2, .2);
    rl_leg_transform.pre_multiply(Mat4.translation(-1.8, 1.8, 35));
    this.shapes.ball.draw(caller, this.uniforms, rl_leg_transform, { ...this.materials.flesh, color : flesh});
    let l_foot_transform = Mat4.scale(1, 1, 1);
    l_foot_transform.pre_multiply(Mat4.translation(-4.2, 0.6, 34.65));
    this.shapes.ball.draw(caller, this.uniforms, l_foot_transform, { ...this.materials.flesh, color : flesh});
    let r_foot_transform = Mat4.scale(1, 1, 1);
    r_foot_transform.pre_multiply(Mat4.translation(-1.8, 0.6, 34.65));
    this.shapes.ball.draw(caller, this.uniforms, r_foot_transform, { ...this.materials.flesh, color : flesh});
    this.human.draw(caller, this.uniforms, { ...this.materials.flesh, color : flesh});

    const dt_adjusted = Math.min(1 / 30, this.uniforms.animation_delta_time / 1000);
    const t_n = t + dt_adjusted;
    this.right_target_pos = Array.from(this.spline.get_position(this.t - Math.floor(this.t)));
    this.left_target_pos = Array.from(this.spline2.get_position(this.t - Math.floor(this.t)));
    for (; t <= t_n; t += 20 ){
      const k = 0.029;
      let right_curr_pos = Array.from(this.human.get_right_end_effector_position());
      let left_curr_pos = Array.from(this.human.get_left_end_effector_position())

      let right_E = math.subtract(this.right_target_pos, right_curr_pos);
      let left_E = math.subtract(this.left_target_pos, left_curr_pos);


      let right_error_dist = Math.sqrt(right_E[0] ** 2 + right_E[1] ** 2 + right_E[2] ** 2);
      let left_error_dist = Math.sqrt(left_E[0] ** 2 + left_E[1] ** 2 + left_E[2] ** 2);

      if (right_error_dist >= k){
        let dx = math.multiply(10, math.multiply(k, right_E));
        let right_J = this.human.calculate_right_Jacobian();
        let Jinv = this.human.calculate_inverse_Jacobian(right_J);
        let dtheta = math.multiply(math.transpose(dx), Jinv);
        this.human.right_theta = math.add(this.human.right_theta, dtheta);
        let sum = new Array(3);
        for (let i = 0; i < 3; i++){
          sum[i] = this.human.right_theta[i] + dtheta[i];
        }
      }

      const k2 = 0.01;
      if (left_error_dist >= k2){
        let dx = math.multiply(7, math.multiply(k2, left_E));
        let left_J = this.human.calculate_left_Jacobian();
        let Jinv = this.human.calculate_inverse_Jacobian(left_J);
        let dtheta = math.multiply(math.transpose(dx), Jinv);
        this.human.left_theta = math.add(this.human.left_theta, dtheta);
        let sum = new Array(3);
        for (let i = 0; i < 3; i++){
          sum[i] = this.human.left_theta[i] + dtheta[i];
        }
      }

    }
    this.initial_set = true;
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.

    this.control_panel.innerHTML += "Part Two:";
    this.new_line();
    this.key_triggered_button( "Config", [], this.parse_commands );
    this.new_line();
    this.key_triggered_button( "Run", [], this.start );
    this.new_line();
    this.key_triggered_button("Reset Bumper Cars", ["Shift", "R"], this.reset_cars);
    this.new_line();
    this.key_triggered_button("Fireworks", ["f"], this.start_fireworks.bind(this));
  }

  reset_cars(){
    this.starting_rot_ang = 1/50;
    this.car1 = new Car(-10, 0, 1);
    this.car2 = new Car(10, 0, 0);
    this.velocities = this.car1.calculate_collision(this.car2);
    this.velocitized = false;
    this.collided = false;
    this.hit_wall = false;
  }

  start_fireworks() {
    this.fireworks_animation = true;
    this.fireworks = new FireworksDisplay(20, 100, 20, 5);
  }

  parse_commands() {
    let text = document.getElementById("input").value;
    //TODO
    //this.spline = new Spline();
    const lines = text.split('\n');
    for (const line of lines) {
      try {
        this._parse_line(line);
      } catch (error) {
        console.error(error);
        document.getElementById("output").value = "invalid";
        return;
      }
    }
  }

  _parse_line(line){
    const words = line.trim().split(/\s+/);
    if(words[0] === "add"){
      const x = parseFloat(words[2]);
      const y = parseFloat(words[3]);
      const z = parseFloat(words[4]);
      const tx = parseFloat(words[5]);
      const ty = parseFloat(words[6]);
      const tz = parseFloat(words[7]);
      this.spline.add_points(x, y, z, tx, ty, tz);
    }
    else if(words[0] === "set" && words[1] === "point"){
      let index = parseInt(words[2]);
      this.spline.set_point(index, words[3], words[4], words[5]);
    }
    else if(words[0] === "set" && words[1] === "tangent"){
      let index = parseInt(words[2]);
      this.spline.set_tan(index, words[3], words[4], words[5]);
    }
    else if(words[0] === "get_arc_length"){
      document.getElementById("output").value = this.spline._get_arc_length();
    }
    else{
      throw "invalid command" + words[0];
    }
  }

  update_scene() { // callback for Draw button
    document.getElementById("output").value = "update_scene";
    //TODO
    const curve_fn = (t) => this.spline.get_positions(t);
    this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
  }
}