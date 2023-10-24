import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'
export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0x000000, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.001,
			 1000
		)
 
		this.camera.position.set(0, 0, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

		this.addObjects()		 
		this.resize()
		this.render()
		this.setupResize()
			this.addLights()
 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		// this.imageAspect = 853/1280
		// let a1, a2
		// if(this.height / this.width > this.imageAspect) {
		// 	a1 = (this.width / this.height) * this.imageAspect
		// 	a2 = 1
		// } else {
		// 	a1 = 1
		// 	a2 = (this.height / this.width) / this.imageAspect
		// } 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			wireframe: true,
			fragmentShader,
	 
		})

		
 


		const getMaterial= () => {
			this.material = new THREE.MeshPhysicalMaterial({
				color: 0xffff00,
				roughness: 0,
				metalness: .5,
				clearcoat: 1,
				clearcoatRoughness: .4,
				slde: THREE.DoubleSide,
		 
				// wireframe: true
			}) 


			this.material.onBeforeCompile = (shader) => {
				shader.uniforms.playhead = {value: 0}


				shader.fragmentShader = `
				uniform float playhead; 
				` + shader.fragmentShader


				shader.fragmentShader = shader.fragmentShader.replace(
					`#include <logdepthbuf_fragment>`,
					`
			 
					float diff = dot(vec3(1.), vNormal);
					vec3 a = vec3(.5, .5, .5);
					vec3 b = vec3(.5, .5, .5);
					vec3 c = vec3(1., 1., 1.);
					vec3 d = vec3(0., .10, .20);

					vec3 cc = a + b * cos(2. * 3.14 * (c * diff + d + playhead * 3.));

 

					diffuseColor.rgb = vec3(diff, 0., 0.);
					diffuseColor.rgb = cc;

					
					
					` + '#include <logdepthbuf_fragment>'
				)
				this.material.userData.shader = shader
			}

		}
		getMaterial()

 


		const helicold = (u, v, target) => {
			let alpha = Math.PI * 2 * (u - .5)
			let thelta = Math.PI * 2 * (v - .5)
			let t = 5
			let bottom = 1 + Math.cosh(alpha) * Math.cosh(thelta)

			let x  = Math.sinh(alpha) * Math.cos(t * thelta) / bottom ,
			 z = Math.sinh(alpha) * Math.sin(t * thelta) / bottom,
			 y = 1.5 * Math.cosh(alpha) * Math.sinh(thelta) / bottom 

			 target.set(x,y,z)
		}
		
		this.geometry = new ParametricGeometry(helicold, 100,100)
		this.plane = new THREE.Mesh(this.geometry, this.material)
		
		this.scene.add(this.plane)
 
	}
 


	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		// this.material.uniforms.time.value = this.time
		this.plane.rotation.y = this.time / 10
				//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 