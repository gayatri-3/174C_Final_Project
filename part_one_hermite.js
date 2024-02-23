import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

import {Curve_Shape, Spline, Particle, Spring, Simulation} from "./SplineCurve.js";

export
const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component
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
          'axis' : new defs.Axis_Arrows() };

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
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        // TODO: you should create a Spline class instance
        this.spline = new Spline();
        this.spline.add_point(2.0, 8.0, 0.0, -10.0, 0.0, 20.0);
        this.spline.add_point(4.0, 7.0, 5.0, 20.0, 0.0, 20.0);
        this.spline.add_point(6.0, 6.0, 3.0, 20.0, 0.0, -10.0);
        this.spline.add_point(5.0, 9.0, 9.0, -20.0, 0.0, -20.0);
        this.spline.add_point(2.0, 8.0, 0.0, -20.0, 0.0, 20.0);

        this.sample_cnt = 1000;
        this.t_step = 0.01;
        this.t_sim = 0;

        const curve_fn = (t) => this.spline.get_position(t);
        this.curve = new Curve_Shape(curve_fn, this.sample_cnt);

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

        // for(let i = 0; i < num -1; i++) {
        //   let spring = new Spring();
        //   spring.particle_1 = this.sim.particles[i];
        //   spring.particle_2 = this.sim.particles[i+1];
        //   spring.ks = 5;
        //   spring.kd = 0.1;
        //   spring.rest_length = 1;
        //   this.sim.springs.push(spring);
        // }

        this.sim.ground_ks = 5000;
        this.sim.ground_kd = 1;
        this.sim.g_acc = vec3(0, -9.8, 0);

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
          Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;
        const angle = Math.sin( t );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20 * Math.cos(angle), 20,  20 * Math.sin(angle), 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Part_one_hermite extends Part_one_hermite_base
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

    const blue = color( 0,0,1,1 ), yellow = color( 1,0.7,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    this.curve.draw(caller, this.uniforms);

    // add some fluctuation
    if (this.curve_fn && this.sample_cnt === this.curve.sample_count) {
      this.curve.update(caller, this.uniforms,
          (s) => this.curve_fn(s).plus(vec3(Math.cos(this.t * s), Math.sin(this.t), 0)) );
    }

    // TODO: you should draw spline here.
    this.curve.draw(caller, this.uniforms);

    this.sim.draw(caller, this.uniforms, this.shapes, this.materials);

    let dt = 1/60;
    dt = Math.min(1/30, dt);

    let t_next = this.t_sim + dt;
    while(this.t_sim < t_next) {
      let point1 = this.spline.get_position(Math.pow(Math.sin(this.t_sim / 40),2));
      this.sim.update(this.t_step, point1);
      console.log(point1);
      this.t_sim += this.t_step;
    }
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

/*

class Curve_Shape extends Shape {
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

const Spline =

    class Spline {
      constructor(){
        this.points = [];
        this.tangents = [];
        this.size = 0;
        this.output_text = "";
      }

      add_points(x, y, z, tx, ty, tz) {
        this.points.push(vec3(x, y, z));
        this.tangents.push(vec3(tx, ty, tz));
        this.size += 1;
      }

      set_point(i, xVal, yVal, zVal){
        this.points[i][0] = parseFloat(xVal);
        this.points[i][1] = parseFloat(yVal);
        this.points[i][2] = parseFloat(zVal);
        //console.log(this.points[i].toString());
      }

      set_tan(i, xTan, yTan, zTan){
        this.tangents[i][0] = parseFloat(xTan);
        this.tangents[i][1] = parseFloat(yTan);
        this.tangents[i][2] = parseFloat(zTan);
        //console.log(this.tangents[i].toString());
      }


      // test part 1 code
      // add point  0.0 5.0 0.0   -20.0  0.0   20.0
      // add point  0.0 5.0 5.0    20.0  0.0   20.0
      // add point  5.0 5.0 5.0    20.0  0.0  -20.0
      // add point  5.0 5.0 0.0   -20.0  0.0  -20.0
      // add point  0.0 5.0 0.0   -20.0  0.0   20.0
      // set point 0 1.0 1.0 1.0
      // set tangent 0 1.0 1.0 1.0
      // get_arc_length



      h0(t){
        return 1-t;
      }

      h1(t){
        return t;
      }

      function
      get_positions(t) {

        const A = Math.floor(t * (this.size - 1));
        const B = Math.ceil(t * (this.size - 1));
        const s = (t * (this.size - 1)) % 1.0;

        let pa = this.points[A].copy();
        let ma = this.tangents[A].copy();
        let pb = this.points[B].copy();
        let mb = this.tangents[B].copy();
        let scaler = 1/(this.size - 1);

        let firstTerm = pa.times(this.h00(s));
        let secondTerm = ma.times(this.h01(s)).times(scaler);
        let thirdTerm = pb.times(this.h10(s));
        let fourthTerm = mb.times(this.h11(s)).times(scaler);

        return firstTerm.plus(secondTerm).plus(thirdTerm).plus(fourthTerm);
      }

      h00(t) {
        return 2 * Math.pow(t, 3) - 3 * Math.pow(t, 2) + 1;
      }

      h01(t) {
        return Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
      }

      h10(t) {
        return -2 * Math.pow(t, 3) + 3*Math.pow(t, 2);
      }

      h11(t) {
        return Math.pow(t, 3) - Math.pow(t, 2);
      }

      function
      _get_arc_length(){
        let length = 0;

        let sample_cnt = 1000;
        let prev = this.get_positions(0);
        for (let i = 1; i < sample_cnt + 1; i++){
          const t = i/sample_cnt;
          const curr = this.get_positions(t);
          length += curr.minus(prev).norm()
          prev = curr
        }
        return length;
      }

      function
      get_size(){
        return this.size;
      }

      function
      get_points(){
        return this.points;
      }

      function
      get_tangents(){
        return this.tangents;
      }

      function
      set_text(inputText){
        this.output_text = inputText;
      }

      function
      get_text(){
        return this.output_text;
      }
    };


function
remove_commas(inputString){
  const valuesArray = inputString.split(',');
  const formattedString = valuesArray.join(' ');
  return formattedString;
}

*/
