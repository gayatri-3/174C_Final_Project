import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.
class Particle {
  constructor() {
    this.mass = 0;
    this.pos = vec3(0, 0, 0);
    this.vel = vec3(0, 0, 0);
    this.acc = vec3(0, 0, 0);
    this.ext_force = vec3(0, 0, 0);
    this.valid = false;
    this.integration = "";
  }

  update(dt) {
    if(!this.valid) throw "Initialization not complete - particle";

    this.acc = this.ext_force.times(1 / (this.mass));

    if(this.integration === "euler") {
      this.forward_euler(dt);
    }
    if(this.integration === "symplectic") {
      this.symplectic_euler(dt);
    }
    if(this.integration === "verlet") {
      this.verlet(dt);
    }
  }

  forward_euler(dt) {
    this.pos = this.pos.plus(this.vel.times(dt));
    this.vel = this.vel.plus(this.acc.times(dt));
  }
  symplectic_euler(dt) {
    this.vel = this.vel.plus(this.acc.times(dt));
    this.pos = this.pos.plus(this.vel.times(dt));
  }
  verlet(dt) {
    this.pos = this.pos.plus(this.vel.times(dt)).plus(this.acc.times((Math.pow(dt, 2)/2)));
    let a = this.acc.copy();
    this.acc = this.ext_force.times(dt);
    this.vel.plus(a2.times(dt/2));
  }


}

class Spring {
  constructor() {
    this.particle_1 = null;
    this.particle_2 = null;
    this.ks = 0;
    this.kd = 0;
    this.rest_length = 0;
    this.valid = false;
  }

  update() {
    if(!this.valid) throw "Initialization not complete - spring";

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

class Simulation {
  constructor() {
    this.particles = [];
    this.springs = [];
    this.g_acc = 0;
    this.ground_ks = 0;
    this.ground_kd = 0;
    this.t_step = 0;
  }

  update(dt) {
    for(const p of this.particles) {
      p.ext_force = this.g_acc.times(p.mass);
      this.calculate_ground_forces(p);
      p.update(dt);
    }

    for(const s of this.springs) {
      s.update();
    }

    /*
    for(const p of this.particles) {
      p.update(dt);
    }
    */

  }

  calculate_ground_forces(p) {
    let pg = vec3(0, 0, 0);
    let n = vec3(0, 1, 0);
    let left = n.times(n.dot(pg.minus(p.pos))).times(this.ground_ks);
    let right = n.times(n.dot(p.vel)).times(this.ground_kd);
    p.ext_force = p.ext_force.plus(left.minus(right));
  }

  draw(webgl_manager, uniform, shapes, materials){
    for(const p of this.particles){
      const pos = p.pos;
      let model_transform = Mat4.scale(0.2, 0.2, 0.2);
      model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
      const blue = color( 0,0,1,1 );
      shapes.ball.draw(webgl_manager, uniform, model_transform, {... materials.plastic, color: blue});
    }


    for (const s of this.springs){
      const p1  = s.particle_1.pos;
      const p2 = s.particle_2.pos;
      const len = (p2.minus(p1)).norm();
      const center = (p1.plus(p2)).times(0.5);

      let model_transform = Mat4.scale(0.05, len/2, 0.05);

      const p = p1.minus(p2).normalized();
      let v = vec3(0,1,0);
      if (Math.abs(v.cross(p).norm()) < 0.1){
        v = vec3(0,0,1);
        model_transform = Mat4.scale(0.05, 0.05, len/2);
      }
      const w = v.cross(p).normalized();

      const theta = Math.acos(v.dot(p));
      model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
      model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
      const red = color(1,0,0,1);
      shapes.box.draw(webgl_manager, uniform, model_transform, {... materials.plastic, color: red});

    }

  }
}

export
const Part_two_spring_base = defs.Part_two_spring_base =
    class Part_two_spring_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
                                               // exposes only the display() method, which actually places and draws the shapes,
                                               // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init");

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

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        // TODO: you should create the necessary shapes
        this.simulation = new Simulation();
        this.running = false;
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


export class Part_two_spring extends Part_two_spring_base
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

    const blue = color( 0,0,1,1 ), yellow = color( 1,1,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    // TODO: you should draw spline here.
    this.simulation.draw(caller, this.uniforms, this.shapes, this.materials);


    let t_sim = 0;

    let dt = 1/60;
    dt = Math.min(1/30, dt);
    let t_step = this.simulation.t_step;
    //let t_step = 1/1000;
    console.log(t_step);

    if(this.running) {
      let t_next = t_sim + dt;
      while(t_sim < t_next) {
        this.simulation.update(t_step);
        t_sim += t_step;
      }
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

    /* Some code for your reference
    this.key_triggered_button( "Copy input", [ "c" ], function() {
      let text = document.getElementById("input").value;
      console.log(text);
      document.getElementById("output").value = text;
    } );
    this.new_line();
    this.key_triggered_button( "Relocate", [ "r" ], function() {
      let text = document.getElementById("input").value;
      const words = text.split(' ');
      if (words.length >= 3) {
        const x = parseFloat(words[0]);
        const y = parseFloat(words[1]);
        const z = parseFloat(words[2]);
        this.ball_location = vec3(x, y, z)
        document.getElementById("output").value = "success";
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    } );
     */
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
    if(words[0] === "create" && words[1] === "particles"){
      let numParticles = parseInt(words[2]);
      for (let i = 0; i < numParticles; i++) {
        let p = new Particle();
        this.simulation.particles.push(p);
      }
    }
    else if(words[0] === "particle"){
      const index = parseInt(words[1]);
      const mass = parseFloat(words[2]);
      const x = parseFloat(words[3]);
      const y = parseFloat(words[4]);
      const z = parseFloat(words[5]);
      const vx = parseFloat(words[6]);
      const vy = parseFloat(words[7]);
      const vz = parseFloat(words[8]);

      this.simulation.particles[index].mass = mass;
      this.simulation.particles[index].pos = vec3(x, y, z);
      this.simulation.particles[index].vel = vec3(vx, vy, vz);
      this.simulation.particles[index].valid = true;
    }
    else if(words[0] === "all_velocities"){
      let vx = parseFloat(words[1]);
      let vy = parseFloat(words[2]);
      let vz = parseFloat(words[3]);
      for(let i = 0; i < this.simulation.particles.length; i++) {
        this.simulation.particles[i].vel = vec3(vx, vy, vz);
      }
    }
    else if(words[0] === "create" && words[1] === "springs"){
      let numSprings = parseInt(words[2]);
      for (let i = 0; i < numSprings; i++) {
        let s = new Spring();
        this.simulation.springs.push(s);
      }
    }
    else if(words[0] === "link"){
      const sIndex = parseInt(words[1]);
      const pIndex1 = parseInt(words[2]);
      const pIndex2 = parseInt(words[3]);
      const ks = parseFloat(words[4]);
      const kd = parseFloat(words[5]);
      const length = parseFloat(words[6]);

      this.simulation.springs[sIndex].particle_1 = this.simulation.particles[pIndex1];
      this.simulation.springs[sIndex].particle_2 = this.simulation.particles[pIndex2];
      this.simulation.springs[sIndex].ks = ks;
      this.simulation.springs[sIndex].kd = kd;
      if (length >= 0) {
        this.simulation.springs[sIndex].rest_length = length;
      }
      else{
        this.simulation.springs[sIndex].rest_length = vec3.distance(this.simulation.springs[sIndex].particle_1, this.simulation.springs[sIndex].particle_2);
      }
      this.simulation.springs[sIndex].valid = true;
    }
    else if(words[0] === "integration"){
      for(let i = 0; i < this.simulation.particles.length; i++) {
        this.simulation.particles[i].integration = words[1];
      }
      this.simulation.t_step = parseFloat(words[2]);
    }
    else if(words[0] === "ground"){
      this.simulation.ground_ks = parseFloat(words[1]);
      this.simulation.ground_kd = parseFloat(words[2]);
    }
    else if(words[0] === "gravity"){
      this.simulation.g_acc = vec3(0, -1*parseFloat(words[1]), 0);
    }
    else{
      throw "invalid command" + words[0];
    }
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    //TODO
    this.running = true;


  }
}