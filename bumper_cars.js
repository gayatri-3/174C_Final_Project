import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
import { Articulated_Human } from './human.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

import {BezierCurve, Fountain} from "./fountain.js";
import {Rollercoaster} from "./Rollercoaster.js";
import {Curve_Shape, Spline, Particle, Spring, Simulation, Particle_Simulation, TreeDrawer, FireworksDisplay, CarnivalStand, Stage} from "./SplineCurve.js";

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
        this.camera_location = Mat4.look_at(vec3 (0, 33, 37), vec3 (0, 25, 10), vec3 (0, 1, 0));
        this.bumper_cam = false;
        this.coaster_cam = false;
        this.fountain_cam = false;
        this.main_scene_cam = true;
        this.bear_cam = false;
        this.ride_coaster_cam = false;
        this.ferris_cam = false;
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
          'ferris-wheel-base' : new Shape_From_File("./assets/ferris_wheel/ferris_wheel2.obj"),
          'ferris-wheel-car' : new Shape_From_File("./assets/ferris_wheel/ferris_wheel_car.obj"),
          'mascot-head' : new Shape_From_File("./assets/mascot/mascot.obj"),
          'cylinder' : new defs.Rounded_Capped_Cylinder(50, 32, [[0, 10], [0, 5]]),
          'cone' : new defs.Rounded_Closed_Cone(50, 4, [[0, 10], [0, 5]])
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
        this.materials.stone = {shader: tex_phong, ambient: 1, texture: new Texture("assets/stone.png")}
        this.materials.water = {shader: tex_phong, ambient: 1, diffusivity: 1, specularity: .5, texture: new Texture("assets/water.png")}
        this.materials.sky = {shader: tex_phong, ambient: 1, texture: new Texture("assets/sky.png")}

        //carnival stands materials
        this.materials.red_white_stripes = {shader: tex_phong, ambient: 1, texture: new Texture("assets/red_white_stripes.jpg")}
        this.materials.blue_white_stripes = {shader: tex_phong, ambient: 1, texture: new Texture("assets/blue_white_stripes.png")}
        this.materials.ticket_booth = {shader: tex_phong, ambient: 1, texture: new Texture("assets/ticket_booth_square.png")}
        this.materials.popcorn_booth = {shader: tex_phong, ambient: 1, texture: new Texture("assets/popcorn.png")}
        this.materials.ice_cream_booth = {shader: tex_phong, ambient: 1, texture: new Texture("assets/ice_cream.png")}


        this.materials.ground = {shader: tex_phong, ambient: 1, texture: new Texture("assets/grass_1.jpg")}
        this.materials.flesh   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  0, color: color( .9,.5,.9,1 ) }

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
        this.random_colors = [];
        for (var i = 0; i < 8; i++) {
          this.random_colors.push(color(Math.random(), Math.random(), Math.random(), 1)); // Adjust the range as needed
        }

        // BUMPER CAR INIT
        this.starting_rot_ang = 1/50;
        this.car1 = new Car(-10, 0, 1);
        this.car2 = new Car(10, 0, 0);
        this.velocities = this.car1.calculate_collision(this.car2);
        this.velocitized = false;
        this.collided = false;
        this.hit_wall = false;

        //tree init
        const branchColor = [0.5, 0.35, 0.05, 1]; // Brown
        const leafColor = [0.0, 0.8, 0.0, 1]; // Green
        const levels = 4;
        const branchLength = 2;
        const branchScaleFactor = 0.5; // Adjust the branch scaling factor
        const leafScaleFactor = 1; // Adjust the leaf scaling factor
        this.trees = [];
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-19, -1, -40)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(20, -1, -45)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(29, -1, -25)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(40, -1, 0)));
        this.trees.push(new TreeDrawer(4, 2.3, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(40, -1, -10)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(40, -1, -20)));
        this.trees.push(new TreeDrawer(3, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-28.5, -1, -28)));
        this.trees.push(new TreeDrawer(3, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(10, -1, -10)));
        this.trees.push(new TreeDrawer(3, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-10, -1, -10)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(20, -1, 30)));
        this.trees.push(new TreeDrawer(5, 2.3, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-40, -1, -20)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-20, -1, 35)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-45, -1, 0)));
        this.trees.push(new TreeDrawer(levels, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-45, -1, 15)));
        // this.trees.push(new TreeDrawer(2, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-10, -3.5, -15)));
        // this.trees.push(new TreeDrawer(2, branchLength, branchColor, leafColor, branchScaleFactor, leafScaleFactor, Mat4.translation(-10, -3.5, -15)));



        //fireworks init
        this.fireworks_animation = false;
        this.night = false;
        this.fireworks_animation_counter = 0;
        // for some reason cannot change these values
        //this.fireworks = new FireworksDisplay(10, 10, 10, 2);

        // carnival init
        this.carnival_stand_tickets = new CarnivalStand();
        this.carnival_stand_icecream = new CarnivalStand();
        this.carnival_stand_popcorn = new CarnivalStand();

        // stage init
        this.stage = new Stage();

        // animatronic
        this.spline = new Spline();
        this.spline.add_point(-8, 25.0, 55.15, 2, 0.0, 0.0);
        this.spline.add_point(-6, 15.0, 55.15, -2, 0.0, 0.0);
        this.spline.add_point(-8, 25.0, 55.15, -2, 0.0, 0.0);

        // comment
        this.spline2 = new Spline();
        this.spline2.add_point(-1, 23.0, 55.15, -1, 0.0, 0.0);
        this.spline2.add_point(-3, 15.0, 55.15, 1, 0.0, 0.0);
        this.spline2.add_point(-1, 23.0, 55.15, 1, 0.0, 0.0);

        const curve_fn = (t) => this.spline.get_position(t);
        const curve_fn2 = (t) => this.spline2.get_position(t);
        this.sample_cnt = 1000;
        this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
        this.curve2 = new Curve_Shape(curve_fn2, this.sample_cnt2);

        this.human = new Articulated_Human;
        // this.right_target_pos = vec3(-4.5, 12.0, 32.15);
        this.left_target_pos = vec3(2.5, 12.0, 32.15);
        this.left_target_pos = vec3(2.5, 12.0, 32.15);
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
          if(this.main_scene_cam){
            this.camera_location = Mat4.look_at(vec3 (0, 33, 37), vec3 (0, 25, 10), vec3 (0, 1, 0));
          }
          Shader.assign_camera( this.camera_location, this.uniforms );
        }
        console.log(this.bumper_cam);
        if(this.bumper_cam){
          this.camera_location = Mat4.look_at(vec3 (20, 15, 15), vec3 (10, 10, 5), vec3 (0, 1, 0));
        }
        else if(this.fountain_cam){
          this.camera_location = Mat4.look_at(vec3 (-10, 8, -15), vec3 (-30, 3, -35), vec3 (0, 1, 0));
        }
        else if(this.coaster_cam){
          this.camera_location = Mat4.look_at (vec3 (0, 20, 10), vec3 (0, 17, -10), vec3 (0, 1, 0));
        }
        else if(this.main_scene_cam){
          this.camera_location = Mat4.look_at(vec3 (0, 33, 37), vec3 (0, 25, 10), vec3 (0, 1, 0));
        }
        else if(this.bear_cam){
          this.camera_location = Mat4.look_at (vec3 (0, 10, -10), vec3 (0, 10, 0), vec3 (0, 1, 0));
        }
        else if(this.ride_coaster_cam){
          let center = this.rollercoaster.get_center();
          let eye = vec3(center[0]+0.5, center[1], center[2]);
          this.camera_location = Mat4.look_at (eye, center, vec3 (0, 1, 0));
        }
        else if(this.ferris_cam){
        this.camera_location = Mat4.look_at (vec3 (-20, 10, 0), vec3 (0, 15, 0), vec3 (0, 1, 0));
        }

        else{
          this.camera_location = Mat4.look_at(vec3 (0, 33, 37), vec3 (0, 25, 10), vec3 (0, 1, 0));
        }
        Shader.assign_camera( this.camera_location, this.uniforms );
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

        // ferris wheel init
        this.ferris_wheel_base_transform = Mat4.identity().times(Mat4.translation(25, 20, 1)).times(Mat4.scale(10, 10, 10));
        this.ferris_wheel_car_transforms = [
          Mat4.identity().times(Mat4.translation(25, 15, 19)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 5, 12)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 2, 1)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 5, -10)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 15, -15)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 27, -10)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 33, 1)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
          Mat4.identity().times(Mat4.translation(25, 28, 12)).times(Mat4.scale(3, 3, 3)).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)),
        ];
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
    //Fountain with water drops
    this.fountain.draw(caller, this.uniforms, this.shapes, this.materials);

    let dt = 1/60;
    dt = Math.min(1/30, dt);
    let t_next = this.sim_t + dt;
    while(this.sim_t < t_next) {
      this.fountain.update(this.sim_t, dt);
      this.sim_t += this.step_t;
    }

    // TODO: you should draw spline here.
    //Rollercoaster
    this.rollercoaster.draw(caller, this.uniforms, this.materials, this.shapes);

    let carnival_stand_transform = Mat4.identity().times(Mat4.translation(-25,1,-10));
    this.carnival_stand_tickets.draw(caller, this.uniforms, this.shapes, carnival_stand_transform, this.materials, "tickets");

    carnival_stand_transform = Mat4.identity().times(Mat4.translation(-25,1,0));
    this.carnival_stand_icecream.draw(caller, this.uniforms, this.shapes, carnival_stand_transform, this.materials, "ice_cream");

    carnival_stand_transform = Mat4.identity().times(Mat4.translation(-25,1,10));
    this.carnival_stand_popcorn.draw(caller, this.uniforms, this.shapes, carnival_stand_transform, this.materials, "popcorn");


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
    for(let i = 0; i < this.trees.length; i++) {
      this.trees[i].draw(caller, this.uniforms, this.shapes, this.materials);
    }


    // draw fireworks when button pressed
    if (this.fireworks_animation === true) {
      //draw fireworks
      const currentTime = performance.now() / 1000; // Convert to seconds
      const dt = currentTime - lastTimestamp;
      lastTimestamp = currentTime;

      this.fireworks.update(dt);
      this.fireworks.draw(caller, this.uniforms, this.shapes, this.materials);

      this.fireworks_animation_counter++;
    }

    // after 200 loops, make it day again
    if(this.fireworks_animation_counter > 200){ // increase counter to make night sky stay longer
      this.night = false;
      this.fireworks_animation_counter = 0;
    }

    // change sky if night
    if (this.night){
      let sky_transform = Mat4.identity().times(Mat4.scale(49,49,49));
      this.shapes.ball.draw(caller, this.uniforms, sky_transform, {...this.materials.plastic, color: color(0,0,0.2,1)});
    }


    // ferris wheel
    // ferris wheel center: 25, 20, 1
    this.ferris_wheel_base_transform = this.ferris_wheel_base_transform.times(Mat4.rotation(t / 2, 1, 0, 0));
    this.shapes['ferris-wheel-base'].draw(caller, this.uniforms, this.ferris_wheel_base_transform, this.materials.bumper_car_floor);
    this.shapes.box.draw(caller, this.uniforms, Mat4.identity().pre_multiply(Mat4.translation(18, 3, -2).times(Mat4.scale(1, 15, 1))).times(Mat4.rotation(45, 1, 0, 0)), this.materials.bumper_car_floor);
    this.shapes.box.draw(caller, this.uniforms, Mat4.identity().pre_multiply(Mat4.translation(18, 3, 4).times(Mat4.scale(1, 15, 1))).times(Mat4.rotation(-45, 1, 0, 0)), this.materials.bumper_car_floor);
    this.ferris_wheel_car_transforms = [
      this.ferris_wheel_car_transforms[0].pre_multiply(Mat4.translation(0, 2 + 15.3 * Math.cos((t / 2)),  -18 + (5 * Math.PI * Math.sin((t / 2))))),
      this.ferris_wheel_car_transforms[1].pre_multiply(Mat4.translation(0, 12 + 15.3 * Math.cos(Math.PI + (t / 2)),  -12 + (5 * Math.PI * Math.sin(Math.PI + (t / 2))))),
      this.ferris_wheel_car_transforms[2].pre_multiply(Mat4.translation(0, 15 + 15.3 * Math.cos((5 * Math.PI / 4) + (t / 2)),   + (5 * Math.PI * Math.sin((5 * Math.PI / 4) + (t / 2))))),
      this.ferris_wheel_car_transforms[3].pre_multiply(Mat4.translation(0, 12 + 15.3 * Math.cos((3 * Math.PI / 4) + (t / 2)),  10 + (5 * Math.PI * Math.sin((3 * Math.PI / 4) + (t / 2))))),
      this.ferris_wheel_car_transforms[4].pre_multiply(Mat4.translation(0, 2 + 15.3 * Math.cos((6 * Math.PI / 4) + (t / 2)),  16 + (5 * Math.PI * Math.sin((6 * Math.PI / 4) + (t / 2))))),
      this.ferris_wheel_car_transforms[5].pre_multiply(Mat4.translation(0, -10 + 15.3 * Math.cos((2 * Math.PI / 4) + (t / 2)),  11 + (5 * Math.PI * Math.sin((2 * Math.PI / 4) + (t / 2))))),
      this.ferris_wheel_car_transforms[6].pre_multiply(Mat4.translation(0, -16 + 15 * Math.cos((Math.PI / 4) + (t / 2)),  0 + (5 * Math.PI * Math.sin((Math.PI / 4) + (t / 2))))),
      this.ferris_wheel_car_transforms[7].pre_multiply(Mat4.translation(0, -12 + 15 * Math.cos((7 * Math.PI / 4) + (t / 2)),  -11 + (5 * Math.PI * Math.sin((7 * Math.PI / 4) + (t / 2))))),
    ]
    for (let i = 0; i < this.ferris_wheel_car_transforms.length; i++){
      this.shapes['ferris-wheel-car'].draw(caller, this.uniforms, this.ferris_wheel_car_transforms[i], {...this.materials.metal, color : this.random_colors[i]});
    }
    // draw stage for the animatronic
    let stage_transform = Mat4.identity().times(Mat4.translation(-3,0,35));
    this.stage.draw(caller, this.uniforms, this.shapes, stage_transform, this.materials);

    // animatronic
    // mascot
    let head_transform = Mat4.scale(2, 2, 2).pre_multiply(Mat4.translation(-3, 17, 35).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes['mascot-head'].draw(caller, this.uniforms, head_transform, {...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1) });
    let eye1_transform = Mat4.scale(0.2, 0.2, 0.2).pre_multiply(Mat4.translation(-4, 17, 33.5).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes.ball.draw(caller, this.uniforms, eye1_transform, {...this.materials.plastic, color : color(0, 0, 0, 1) });
    let eye2_transform = Mat4.scale(0.2, 0.2, 0.2).pre_multiply(Mat4.translation(-2, 17, 33.5).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes.ball.draw(caller, this.uniforms, eye2_transform, {...this.materials.plastic, color : color(0, 0, 0, 1) });
    let mouth_transform = Mat4.scale(0.4, 0.3, 0.7).pre_multiply(Mat4.translation(-3, 16.5, 33.5).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes.ball.draw(caller, this.uniforms, mouth_transform, {...this.materials.plastic, color : color(0, 0, 0, 1) });
    let mouth2_transform = Mat4.scale(0.2, 0.05, 0.7).pre_multiply(Mat4.translation(-3.1, 15.5, 33.5).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes.box.draw(caller, this.uniforms, mouth2_transform, {...this.materials.plastic, color : color(0, 0, 0, 1) });
    let belly_transform = Mat4.scale(1, 3, 1.5).pre_multiply(Mat4.translation(-3.1, 10, 34.5).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)));
    this.shapes.ball.draw(caller, this.uniforms, belly_transform, {...this.materials.plastic, color : flesh });
    let lu_leg_transform = Mat4.scale(0.4, 1.6, .6);
    lu_leg_transform.pre_multiply(Mat4.translation(-4.2, 5.5, 35));
    this.shapes.ball.draw(caller, this.uniforms, lu_leg_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    let ll_leg_transform = Mat4.scale(0.4, 2, .2);
    ll_leg_transform.pre_multiply(Mat4.translation(-4.2, 2.3, 35));
    this.shapes.ball.draw(caller, this.uniforms, ll_leg_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    let ru_leg_transform = Mat4.scale(0.4, 1.6, .6);
    ru_leg_transform.pre_multiply(Mat4.translation(-1.8, 5.5, 35));
    this.shapes.ball.draw(caller, this.uniforms, ru_leg_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    let rl_leg_transform = Mat4.scale(0.4, 2, .2);
    rl_leg_transform.pre_multiply(Mat4.translation(-1.8, 2.3, 35));
    this.shapes.ball.draw(caller, this.uniforms, rl_leg_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    let l_foot_transform = Mat4.scale(1, 1, 1);
    l_foot_transform.pre_multiply(Mat4.translation(-4.2, 1, 34.65));
    this.shapes.ball.draw(caller, this.uniforms, l_foot_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    let r_foot_transform = Mat4.scale(1, 1, 1);
    r_foot_transform.pre_multiply(Mat4.translation(-1.8, 1, 34.65));
    this.shapes.ball.draw(caller, this.uniforms, r_foot_transform, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});
    this.human.draw(caller, this.uniforms, { ...this.materials.flesh, color : color(158/255, 107/255, 79/255, 1)});

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

    this.control_panel.innerHTML += "Buttons:";
    this.new_line();
    this.key_triggered_button("Reset Bumper Cars", ["Shift", "R"], this.reset_cars);
    this.new_line();
    this.key_triggered_button("Fireworks", ["f"], this.start_fireworks.bind(this));
    this.new_line();
    this.key_triggered_button("View Bumper Cars", ["Shift", "A"], this.view_bumper_cars.bind(this));
    this.new_line();
    this.key_triggered_button("View Main Scene", ["Shift", "B"], this.view_main_scene.bind(this));
    this.new_line();
    this.key_triggered_button("View Rolleroaster", ["Shift", "C"], this.view_coaster.bind(this));
    this.new_line();
    this.key_triggered_button("View Fountain", ["Shift", "D"], this.view_fountain.bind(this));
    this.new_line();
    this.key_triggered_button("View Bear", ["Shift", "E"], this.view_bear.bind(this));
    this.new_line();
    this.key_triggered_button("Ride Coaster", ["Shift", "F"], this.ride_coaster.bind(this));
    this.new_line();
    this.key_triggered_button("View Ferris Wheel", ["Shift", "G"], this.view_ferris.bind(this));
  }

  view_ferris(){
    this.bumper_cam = false;
    this.coaster_cam = false;
    this.fountain_cam = false;
    this.main_scene_cam = false;
    this.bear_cam = false;
    this.ride_coaster_cam = false;
    this.ferris_cam = true;
  }
  ride_coaster(){
    this.bumper_cam = false;
    this.coaster_cam = false;
    this.fountain_cam = false;
    this.main_scene_cam = false;
    this.bear_cam = false;
    this.ride_coaster_cam = true;
    this.ferris_cam = false;
  }
  view_bumper_cars(){
    this.bumper_cam = true;
    this.coaster_cam = false;
    this.fountain_cam = false;
    this.main_scene_cam = false;
    this.bear_cam = false;
    this.ride_coaster_cam = false;
    this.ferris_cam = false;
  }

  view_main_scene(){
    this.bumper_cam = false;
    this.coaster_cam = false;
    this.fountain_cam = false;
    this.main_scene_cam = true;
    this.bear_cam = false;
    this.ride_coaster_cam = false;
    this.ferris_cam = false;
  }

  view_coaster(){
    this.bumper_cam = false;
    this.coaster_cam = true;
    this.fountain_cam = false;
    this.main_scene_cam = false;
    this.bear_cam = false;
    this.ride_coaster_cam = false;
    this.ferris_cam = false;
  }

  view_bear(){
    this.bumper_cam = false;
    this.coaster_cam = false;
    this.fountain_cam = false;
    this.main_scene_cam = false;
    this.bear_cam = true;
    this.ride_coaster_cam = false;
    this.ferris_cam = false;
  }

  view_fountain(){
    this.bumper_cam = false;
    this.coaster_cam = false;
    this.fountain_cam = true;
    this.main_scene_cam = false;
    this.bear_cam = false;
    this.ride_coaster_cam = false;
    this.ferris_cam = false;
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
    this.fireworks = new FireworksDisplay(30, 100, 20, 2);
    this.night = true;
    this.fireworks_animation_counter = 0;
  }
}